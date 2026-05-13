import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { GameStatus, GameWinner, type TimeControl } from "@prisma/client";
import type {
  GameConnectionErrorCode,
  GameState,
  MoveInput,
  PieceColor,
  GameResult as SharedGameResult,
} from "@royalchess/shared";
import { gameSocketRoom, moveSchema, SocketEvent } from "@royalchess/shared";
import type { Server } from "socket.io";
import { EloService } from "../elo/elo.service";
import { GamesRepository, type GameWithPlayers } from "../games/games.repository";
import { ChessEngineService } from "./chess-engine.service";
import { AntiCheatService } from "./anti-cheat.service";
import { computeClockTimeoutLoserId } from "./game-session-clock-timeout.util";
import { GameSessionRepository } from "./game-session.repository";
import type { GameSessionRecord } from "./game-session.types";
import {
  buildGameOverPayload,
  EndReason,
  mapDrawEndReason,
  type FinalizedGameMeta,
  type GameOverPayload,
  type OpponentInfo,
} from "./game-end.types";

export type MoveHandleResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly finished: boolean;
      readonly result?: SharedGameResult;
      /**
       * Payload `GAME_OVER` enrichi calculé par `persistFinishedGame`. Permet
       * au gateway d'émettre l'événement avec ELO / adversaire / raison sans
       * re-requêter la base. Présent uniquement lorsque `finished === true`.
       */
      readonly gameOverPayload?: GameOverPayload;
    }
  | { readonly ok: false; readonly error: string };

/** Placeholder Redis tant que l'adversaire d'une partie privée n'a pas rejoint. */
const PENDING_BLACK_PLAYER_ID = "__pending__";

@Injectable()
export class GameSessionService {
  private readonly log = new Logger(GameSessionService.name);
  // Référence au serveur Socket.IO du namespace `/game`, fournie par le
  // gateway via `attachBroadcaster()` dans son hook `afterInit`. On la
  // garde ici plutôt qu'en dépendance circulaire pour permettre aux
  // services REST (ex: rejoindre une partie privée) de pousser un
  // GAME_STATE à tous les clients déjà connectés.
  private broadcastServer: Server | null = null;

  constructor(
    private readonly repo: GameSessionRepository,
    private readonly engine: ChessEngineService,
    private readonly games: GamesRepository,
    private readonly elo: EloService,
    private readonly antiCheat: AntiCheatService,
  ) {}

  attachBroadcaster(server: Server): void {
    this.broadcastServer = server;
  }

  /**
   * Vérifie qu'une connexion WebSocket `/game` est autorisée (partie +
   * session Redis). Ne retire pas la deadline de déconnexion — le gateway
   * s'en charge après succès.
   */
  async getGameSocketAdmission(
    gameId: string,
    userId: string,
  ): Promise<{ ok: true } | { ok: false; code: GameConnectionErrorCode }> {
    const row = await this.games.findByIdWithPlayers(gameId);
    if (!row) {
      return { ok: false, code: "GAME_NOT_FOUND" };
    }
    const isBlack = row.blackPlayerId !== null && userId === row.blackPlayerId;
    if (userId !== row.whitePlayerId && !isBlack) {
      return { ok: false, code: "NOT_A_PARTICIPANT" };
    }
    const session = await this.ensureSession(gameId);
    if (!session) {
      return { ok: false, code: "GAME_NOT_FOUND" };
    }
    return { ok: true };
  }

  async broadcastStateToRoom(gameId: string, stateOverride?: GameState | null): Promise<void> {
    const server = this.broadcastServer;
    if (!server) {
      this.log.warn({ gameId }, "broadcast_state_sans_serveur");
      return;
    }
    const state = stateOverride ?? (await this.getSocketGameState(gameId));
    if (!state) {
      return;
    }
    server.to(gameSocketRoom(gameId)).emit(SocketEvent.GAME_STATE, state);
  }

  async ensureSession(gameId: string): Promise<GameSessionRecord | null> {
    const row = await this.games.findByIdWithPlayers(gameId);
    if (!row) {
      return null;
    }
    if (row.status !== GameStatus.ACTIVE && row.status !== GameStatus.WAITING) {
      return null;
    }
    const existing = await this.repo.getSession(gameId);
    if (existing && existing.blackPlayerId === PENDING_BLACK_PLAYER_ID && row.blackPlayerId) {
      const updated: GameSessionRecord = {
        ...existing,
        blackPlayerId: row.blackPlayerId,
      };
      await this.repo.updateSession(gameId, updated);
      return (await this.repo.getSession(gameId)) ?? updated;
    }
    if (existing) {
      return existing;
    }
    const initialMs = row.initialTime * 1000;
    const incMs = row.increment * 1000;
    const created = this.engine.createGame({ initialTimeMs: initialMs, incrementMs: incMs });
    const session: GameSessionRecord = {
      fen: created.fen,
      pgn: "",
      status: row.status === GameStatus.WAITING ? "waiting" : "active",
      whitePlayerId: row.whitePlayerId,
      blackPlayerId: row.blackPlayerId ?? PENDING_BLACK_PLAYER_ID,
      whiteTimeRemaining: created.whiteTimeRemaining,
      blackTimeRemaining: created.blackTimeRemaining,
      incrementMs: incMs,
      lastMoveTimestamp: Date.now(),
      currentTurn: "w",
      moveCount: 0,
      moveHistoryJson: "[]",
      whiteDrawOffer: false,
      blackDrawOffer: false,
    };
    await this.repo.createSession(gameId, session);
    return session;
  }

  async seedSessionForMatchmadeGame(row: GameWithPlayers): Promise<void> {
    if (await this.repo.getSession(row.id)) {
      return;
    }
    if (!row.blackPlayerId) {
      return;
    }
    const initialMs = row.initialTime * 1000;
    const incMs = row.increment * 1000;
    const created = this.engine.createGame({ initialTimeMs: initialMs, incrementMs: incMs });
    // La fonction n'est invoquée qu'après attribution des deux joueurs
    // (matchmaking auto ou partie privée rejointe via inviteCode). La
    // session Redis doit donc démarrer en `active` directement, sinon l'UI
    // reste bloquée sur l'overlay "En attente de l'adversaire" et le
    // serveur refuse les coups (`session.status !== "active"`).
    const session: GameSessionRecord = {
      fen: created.fen,
      pgn: "",
      status: "active",
      whitePlayerId: row.whitePlayerId,
      blackPlayerId: row.blackPlayerId,
      whiteTimeRemaining: created.whiteTimeRemaining,
      blackTimeRemaining: created.blackTimeRemaining,
      incrementMs: incMs,
      lastMoveTimestamp: Date.now(),
      currentTurn: "w",
      moveCount: 0,
      moveHistoryJson: "[]",
      whiteDrawOffer: false,
      blackDrawOffer: false,
    };
    await this.repo.createSession(row.id, session);
  }

  async clearRedisSession(gameId: string): Promise<void> {
    await this.repo.deleteSession(gameId);
  }

  async verifyParticipant(gameId: string, userId: string): Promise<boolean> {
    const row = await this.games.findByIdWithPlayers(gameId);
    if (!row) {
      return false;
    }
    if (userId !== row.whitePlayerId && (!row.blackPlayerId || userId !== row.blackPlayerId)) {
      return false;
    }
    const session = await this.ensureSession(gameId);
    return session !== null;
  }

  async getSocketGameState(gameId: string): Promise<GameState | null> {
    const row = await this.games.findByIdWithPlayers(gameId);
    const session = await this.repo.getSession(gameId);
    if (!row || !session) {
      return null;
    }
    const status = this.resolveUiStatus(row, session);
    return this.buildGameState(gameId, session, row, status, undefined, null);
  }

  async handleDrawDecline(gameId: string, userId: string): Promise<MoveHandleResult> {
    const row = await this.games.findByIdWithPlayers(gameId);
    if (!row) {
      return { ok: false, error: "partie_introuvable" };
    }
    const session = await this.ensureSession(gameId);
    if (!session || session.status !== "active") {
      return { ok: false, error: "partie_inactive" };
    }
    if (userId !== session.whitePlayerId && userId !== session.blackPlayerId) {
      return { ok: false, error: "non_joueur" };
    }
    const declined = await this.repo.updateSession(gameId, {
      ...session,
      whiteDrawOffer: false,
      blackDrawOffer: false,
    });
    if (!declined) {
      return { ok: false, error: "session_perdue" };
    }
    const next = (await this.repo.getSession(gameId)) ?? session;
    const state = this.buildGameState(gameId, next, row, "active", undefined, null);
    return { ok: true, state, finished: false };
  }

  async setPremove(gameId: string, userId: string, raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
    const p = moveSchema.safeParse(raw);
    if (!p.success) {
      return { ok: false, error: "invalide" };
    }
    const ok = await this.verifyParticipant(gameId, userId);
    if (!ok) {
      return { ok: false, error: "refus" };
    }
    await this.repo.setPremove(gameId, userId, JSON.stringify(p.data));
    return { ok: true };
  }

  async cancelPremove(gameId: string, userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const ok = await this.verifyParticipant(gameId, userId);
    if (!ok) {
      return { ok: false, error: "refus" };
    }
    await this.repo.deletePremove(gameId, userId);
    return { ok: true };
  }

  @Interval(5000)
  processDisconnectDeadlines(): void {
    void this.runDisconnectDeadlines();
  }

  @Interval(1000)
  checkClockTimeouts(): void {
    void this.runClockTimeouts();
  }

  private async runClockTimeouts(): Promise<void> {
    const now = Date.now();
    const { ids, scanIncomplete } = await this.repo.listActiveSessionGameIds(100, 100);
    if (scanIncomplete) {
      this.log.warn("clock_timeout_scan_incomplete");
    }
    for (const gameId of ids) {
      const session = await this.repo.getSession(gameId);
      if (!session || session.status !== "active") {
        continue;
      }
      const loserId = computeClockTimeoutLoserId(session, now);
      if (!loserId) {
        continue;
      }
      await this.handleTimeout(gameId, loserId);
    }
  }

  private async runDisconnectDeadlines(): Promise<void> {
    const now = Date.now();
    const due = await this.repo.listDisconnectDue(now);
    for (const member of due) {
      const idx = member.indexOf(":");
      if (idx <= 0) {
        continue;
      }
      const gameId = member.slice(0, idx);
      const userId = member.slice(idx + 1);
      await this.repo.removeDisconnectDeadline(gameId, userId);
      await this.handleTimeout(gameId, userId);
    }
  }

  private resolveUiStatus(row: GameWithPlayers, session: GameSessionRecord): GameState["status"] {
    if (
      row.status === GameStatus.COMPLETED ||
      row.status === GameStatus.DRAW ||
      row.status === GameStatus.ABANDONED
    ) {
      return "completed";
    }
    return session.status === "waiting" ? "waiting" : "active";
  }

  async finalizeGame(
    gameId: string,
    result: SharedGameResult,
    endReason: EndReason = EndReason.ABANDON,
  ): Promise<void> {
    const row = await this.games.findByIdWithPlayers(gameId);
    const session = await this.repo.getSession(gameId);
    if (!row || !session) {
      throw new BadRequestException("Session ou partie introuvable");
    }
    if (this.isTerminalGameRow(row)) {
      this.log.warn({ gameId, result }, "finalizeGame_idempotent_skip");
      return;
    }
    void (await this.persistFinishedGame(gameId, result, endReason, row, session));
  }

  async handleMove(gameId: string, userId: string, rawMove: unknown): Promise<MoveHandleResult> {
    try {
      const parsed = moveSchema.safeParse(rawMove);
      if (!parsed.success) {
        return { ok: false, error: "coup_invalide" };
      }
      const move: MoveInput = parsed.data;
      let row = await this.games.findByIdWithPlayers(gameId);
      if (!row) {
        return { ok: false, error: "partie_introuvable" };
      }
      if (!row.blackPlayerId) {
        return { ok: false, error: "partie_incomplete" };
      }
      let session = await this.ensureSession(gameId);
      if (!session) {
        return { ok: false, error: "partie_introuvable" };
      }
      if (row.status === GameStatus.WAITING && row.blackPlayerId) {
        const activated = await this.repo.updateSession(gameId, { ...session, status: "active" });
        if (!activated) {
          return { ok: false, error: "session_perdue" };
        }
        await this.games.markGameActive(gameId);
        session = (await this.repo.getSession(gameId)) ?? session;
        row = (await this.games.findByIdWithPlayers(gameId)) ?? row;
      }
      if (session.status !== "active") {
        return { ok: false, error: "partie_inactive" };
      }
      const onTurn = session.currentTurn === "w" ? session.whitePlayerId : session.blackPlayerId;
      if (onTurn !== userId) {
        return { ok: false, error: "pas_votre_tour" };
      }
      const now = Date.now();
      const elapsed =
        session.moveCount === 0 ? 0 : Math.max(0, now - session.lastMoveTimestamp);
      let whiteT = session.whiteTimeRemaining;
      let blackT = session.blackTimeRemaining;
      if (session.currentTurn === "w") {
        whiteT -= elapsed;
      } else {
        blackT -= elapsed;
      }
      const moverRemaining = session.currentTurn === "w" ? whiteT : blackT;
      if (moverRemaining <= 0) {
        const winner: SharedGameResult = session.currentTurn === "w" ? "black" : "white";
        const persistResult = await this.persistFinishedGame(
          gameId,
          winner,
          EndReason.TIMEOUT,
          row,
          session,
        );
        if (persistResult.skipped) {
          return { ok: false, error: "partie_terminee" };
        }
        const after = await this.games.findByIdWithPlayers(gameId);
        const state = after
          ? this.buildGameState(gameId, session, after, "completed", winner, null)
          : null;
        return state
          ? {
              ok: true,
              state,
              finished: true,
              result: winner,
              gameOverPayload: persistResult.payload,
            }
          : { ok: false, error: "finalisation_incomplete" };
      }
      const applied = this.engine.validateAndApplyMove(session.fen, move);
      if (!applied.ok) {
        return { ok: false, error: "coup_illegal" };
      }
      const { value: mr } = applied;
      if (session.moveCount > 0) {
        void this.antiCheat.analyzeMove(gameId, userId, elapsed, session.moveCount + 1);
      }
      const history = await this.repo.getFullMoveHistory(gameId);
      const nextHistory = [...history, mr.san];
      if (session.currentTurn === "w") {
        whiteT = Math.max(0, whiteT) + session.incrementMs;
      } else {
        blackT = Math.max(0, blackT) + session.incrementMs;
      }
      const nextTurn: PieceColor = session.currentTurn === "w" ? "b" : "w";
      const pgn = this.buildPgn(row, nextHistory, undefined);
      const nextSession: GameSessionRecord = {
        ...session,
        fen: mr.fen,
        pgn,
        whiteTimeRemaining: whiteT,
        blackTimeRemaining: blackT,
        lastMoveTimestamp: Date.now(),
        currentTurn: nextTurn,
        moveCount: session.moveCount + 1,
        moveHistoryJson: JSON.stringify(nextHistory),
      };
      const savedMove = await this.repo.updateSession(gameId, nextSession);
      if (!savedMove) {
        return { ok: false, error: "session_perdue" };
      }
      session = nextSession;
      let finished = false;
      let result: SharedGameResult | undefined;
      let gameOverPayload: GameOverPayload | undefined;
      if (mr.isCheckmate) {
        finished = true;
        result = nextTurn === "w" ? "black" : "white";
        const persistResult = await this.persistFinishedGame(
          gameId,
          result,
          EndReason.CHECKMATE,
          row,
          session,
        );
        if (persistResult.skipped) {
          return { ok: false, error: "partie_terminee" };
        }
        gameOverPayload = persistResult.payload;
      } else if (mr.isDraw) {
        finished = true;
        result = "draw";
        const drawReason = mapDrawEndReason(mr.drawReason);
        const persistResult = await this.persistFinishedGame(
          gameId,
          "draw",
          drawReason,
          row,
          session,
        );
        if (persistResult.skipped) {
          return { ok: false, error: "partie_terminee" };
        }
        gameOverPayload = persistResult.payload;
      }
      const freshRow = await this.games.findByIdWithPlayers(gameId);
      const status: GameState["status"] = finished ? "completed" : "active";
      const state = this.buildGameState(gameId, session, freshRow ?? row, status, result, move);
      return { ok: true, state, finished, result, gameOverPayload };
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      this.log.error({ err: e, gameId, userId }, "handleMove_uncaught");
      return { ok: false, error: "erreur_interne" };
    }
  }

  async handleTimeout(gameId: string, userId: string): Promise<MoveHandleResult> {
    const row = await this.games.findByIdWithPlayers(gameId);
    if (!row) {
      return { ok: false, error: "partie_introuvable" };
    }
    const session = await this.ensureSession(gameId);
    if (!session || session.status !== "active") {
      return { ok: false, error: "partie_inactive" };
    }
    if (userId !== session.whitePlayerId && userId !== session.blackPlayerId) {
      return { ok: false, error: "non_joueur" };
    }
    const winner: SharedGameResult = userId === session.whitePlayerId ? "black" : "white";
    const persistResult = await this.persistFinishedGame(
      gameId,
      winner,
      EndReason.TIMEOUT,
      row,
      session,
    );
    if (persistResult.skipped) {
      return { ok: false, error: "partie_terminee" };
    }
    const after = await this.games.findByIdWithPlayers(gameId);
    if (!after) {
      return { ok: false, error: "finalisation_incomplete" };
    }
    const merged: GameSessionRecord = {
      ...session,
      fen: after.fen ?? session.fen,
      pgn: after.pgn,
    };
    const state = this.buildGameState(gameId, merged, after, "completed", winner, null);
    // `handleTimeout` est invoqué par un `@Interval` (sans gateway dans le
    // pipeline d'appel) : il doit donc émettre lui-même `GAME_STATE` puis
    // `GAME_OVER` avec le payload enrichi.
    await this.broadcastStateToRoom(gameId, state);
    const srv = this.broadcastServer;
    if (srv) {
      srv.to(gameSocketRoom(gameId)).emit(SocketEvent.GAME_OVER, persistResult.payload);
    }
    return {
      ok: true,
      state,
      finished: true,
      result: winner,
      gameOverPayload: persistResult.payload,
    };
  }

  async handleResign(gameId: string, userId: string): Promise<MoveHandleResult> {
    const row = await this.games.findByIdWithPlayers(gameId);
    if (!row) {
      return { ok: false, error: "partie_introuvable" };
    }
    const session = await this.ensureSession(gameId);
    if (!session || session.status !== "active") {
      return { ok: false, error: "partie_inactive" };
    }
    if (userId !== session.whitePlayerId && userId !== session.blackPlayerId) {
      return { ok: false, error: "non_joueur" };
    }
    const winner: SharedGameResult = userId === session.whitePlayerId ? "black" : "white";
    const persistResult = await this.persistFinishedGame(
      gameId,
      winner,
      EndReason.RESIGNATION,
      row,
      session,
    );
    if (persistResult.skipped) {
      return { ok: false, error: "partie_terminee" };
    }
    const after = await this.games.findByIdWithPlayers(gameId);
    const state = after
      ? this.buildGameState(gameId, session, after, "completed", winner, null)
      : null;
    return state
      ? {
          ok: true,
          state,
          finished: true,
          result: winner,
          gameOverPayload: persistResult.payload,
        }
      : { ok: false, error: "finalisation_incomplete" };
  }

  async handleDrawOffer(gameId: string, userId: string): Promise<MoveHandleResult> {
    const row = await this.games.findByIdWithPlayers(gameId);
    if (!row) {
      return { ok: false, error: "partie_introuvable" };
    }
    const session = await this.ensureSession(gameId);
    if (!session || session.status !== "active") {
      return { ok: false, error: "partie_inactive" };
    }
    if (userId === session.whitePlayerId) {
      const saved = await this.repo.updateSession(gameId, { ...session, whiteDrawOffer: true });
      if (!saved) {
        return { ok: false, error: "session_perdue" };
      }
    } else if (userId === session.blackPlayerId) {
      const saved = await this.repo.updateSession(gameId, { ...session, blackDrawOffer: true });
      if (!saved) {
        return { ok: false, error: "session_perdue" };
      }
    } else {
      return { ok: false, error: "non_joueur" };
    }
    const next = (await this.repo.getSession(gameId)) ?? session;
    const state = this.buildGameState(gameId, next, row, "active", undefined, null);
    return { ok: true, state, finished: false };
  }

  async handleDrawAccept(gameId: string, userId: string): Promise<MoveHandleResult> {
    const row = await this.games.findByIdWithPlayers(gameId);
    if (!row) {
      return { ok: false, error: "partie_introuvable" };
    }
    const session = await this.ensureSession(gameId);
    if (!session || session.status !== "active") {
      return { ok: false, error: "partie_inactive" };
    }
    const isWhite = userId === session.whitePlayerId;
    const isBlack = userId === session.blackPlayerId;
    if (!isWhite && !isBlack) {
      return { ok: false, error: "non_joueur" };
    }
    const opponentOffered = isWhite ? session.blackDrawOffer : session.whiteDrawOffer;
    if (!opponentOffered) {
      return { ok: false, error: "pas_d_offre" };
    }
    const persistResult = await this.persistFinishedGame(
      gameId,
      "draw",
      EndReason.DRAW_AGREEMENT,
      row,
      session,
    );
    if (persistResult.skipped) {
      return { ok: false, error: "partie_terminee" };
    }
    const after = await this.games.findByIdWithPlayers(gameId);
    const state = after
      ? this.buildGameState(
          gameId,
          { ...session, fen: after.fen ?? session.fen, pgn: after.pgn },
          after,
          "completed",
          "draw",
          null,
        )
      : null;
    return state
      ? {
          ok: true,
          state,
          finished: true,
          result: "draw",
          gameOverPayload: persistResult.payload,
        }
      : { ok: false, error: "finalisation_incomplete" };
  }

  private isTerminalGameRow(row: GameWithPlayers): boolean {
    return (
      row.status === GameStatus.COMPLETED ||
      row.status === GameStatus.DRAW ||
      row.status === GameStatus.ABANDONED
    );
  }

  private parseSanMovesFromJson(json: string): readonly string[] {
    try {
      const parsed: unknown = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((x): x is string => typeof x === "string");
    } catch {
      return [];
    }
  }

  /**
   * Pattern de finalisation idempotent :
   *  1. Re-charge la partie pour détecter une finalisation concurrente (return skipped).
   *  2. Persiste status / winner / pgn / fen / endedAt / endReason en une `UPDATE`.
   *  3. Applique le calcul ELO (Glicko-2) et persiste les deltas / "after"
   *     dans la même ligne `Game` via une seconde `UPDATE` (la transaction
   *     atomique cross-tables `Game + EloRating` n'est pas faisable sans
   *     refondre `EloService` ; on accepte donc le risque d'avoir une ligne
   *     `Game` finalisée sans ELO en cas de crash entre les deux étapes,
   *     ce qui est moins dommageable que l'inverse).
   *  4. Nettoie la session Redis et les marqueurs `playingGame`.
   *  5. Retourne le payload `GAME_OVER` enrichi.
   *
   * @returns `{ skipped: true }` si la partie était déjà terminée (idempotence,
   *          pas de double ELO), sinon `{ skipped: false, payload }`.
   */
  private async persistFinishedGame(
    gameId: string,
    result: SharedGameResult,
    endReason: EndReason,
    _row: GameWithPlayers,
    session: GameSessionRecord,
  ): Promise<{ skipped: true } | { skipped: false; payload: GameOverPayload }> {
    const latest = await this.games.findByIdWithPlayers(gameId);
    if (!latest) {
      this.log.warn({ gameId }, "persistFinishedGame_sans_partie");
      throw new BadRequestException("Session ou partie introuvable");
    }
    if (this.isTerminalGameRow(latest)) {
      this.log.warn({ gameId, result }, "finalizeGame_idempotent_skip");
      return { skipped: true };
    }
    const row = latest;
    const history = await this.repo.getFullMoveHistory(gameId);
    const pgn = this.buildPgn(row, history, result);
    const { prismaStatus, prismaWinner } = this.mapPrismaOutcome(result);
    const opponentInfo = this.buildOpponentInfo(row);
    let meta: FinalizedGameMeta;
    try {
      await this.games.finalizeGame(gameId, {
        status: prismaStatus,
        winner: prismaWinner,
        pgn,
        fen: session.fen,
        endedAt: new Date(),
        endReason,
      });
      meta = await this.applyEloAndBuildMeta(row, result, endReason, opponentInfo);
      // ELO calculé : on persiste les deltas / after dans la même ligne `Game`
      // pour qu'ils soient lisibles depuis l'historique du profil sans
      // requêter `EloRating` à chaque affichage.
      await this.games.finalizeGame(gameId, {
        status: prismaStatus,
        winner: prismaWinner,
        pgn,
        fen: session.fen,
        endedAt: new Date(),
        endReason,
        whiteEloChange: meta.whiteEloChange,
        blackEloChange: meta.blackEloChange,
        whiteEloAfter: meta.whiteEloAfter,
        blackEloAfter: meta.blackEloAfter,
      });
    } catch (e) {
      this.log.error({ err: e, gameId }, "persistFinishedGame");
      throw e;
    }
    await this.repo.clearUserPlayingGame(row.whitePlayerId);
    if (row.blackPlayerId) {
      await this.repo.clearUserPlayingGame(row.blackPlayerId);
    }
    await this.repo.deleteSession(gameId);
    return { skipped: false, payload: buildGameOverPayload(result, meta) };
  }

  private mapPrismaOutcome(result: SharedGameResult): {
    prismaStatus: GameStatus;
    prismaWinner: GameWinner | null;
  } {
    if (result === "draw") {
      return { prismaStatus: GameStatus.DRAW, prismaWinner: GameWinner.DRAW };
    }
    return {
      prismaStatus: GameStatus.COMPLETED,
      prismaWinner: result === "white" ? GameWinner.WHITE : GameWinner.BLACK,
    };
  }

  /**
   * Construit la base `OpponentInfo` (username + avatar). `ratingBefore`
   * est initialisé à 0 ici puis patché par `applyEloAndBuildMeta` qui
   * obtient la valeur exacte depuis `EloService.applyMatchResult`.
   */
  private buildOpponentInfo(row: GameWithPlayers): OpponentInfo {
    return {
      white: {
        username: row.whitePlayer.username,
        avatarUrl: row.whitePlayer.avatarUrl,
        ratingBefore: 0,
      },
      black: {
        username: row.blackPlayer?.username ?? "",
        avatarUrl: row.blackPlayer?.avatarUrl ?? null,
        ratingBefore: 0,
      },
    };
  }

  private async applyEloAndBuildMeta(
    row: GameWithPlayers,
    result: SharedGameResult,
    endReason: EndReason,
    opponentInfo: OpponentInfo,
  ): Promise<FinalizedGameMeta> {
    const tc = row.timeControl as TimeControl;
    const blackId = row.blackPlayerId;
    if (!blackId || !row.blackPlayer) {
      // Cas pathologique : partie sans Black finalisée. On évite NPE en
      // retournant un meta neutre (deltas à 0).
      return {
        endReason,
        whiteEloAfter: 0,
        blackEloAfter: 0,
        whiteEloChange: 0,
        blackEloChange: 0,
        opponentInfo,
        timeControl: tc,
        initialTime: row.initialTime,
        increment: row.increment,
      };
    }
    const outcome = await this.elo.applyMatchResult({
      whitePlayerId: row.whitePlayerId,
      blackPlayerId: blackId,
      result,
      timeControl: tc,
    });
    const enrichedOpponentInfo: OpponentInfo = {
      white: { ...opponentInfo.white, ratingBefore: outcome.white.before },
      black: { ...opponentInfo.black, ratingBefore: outcome.black.before },
    };
    return {
      endReason,
      whiteEloAfter: outcome.white.after,
      blackEloAfter: outcome.black.after,
      whiteEloChange: outcome.white.delta,
      blackEloChange: outcome.black.delta,
      opponentInfo: enrichedOpponentInfo,
      timeControl: tc,
      initialTime: row.initialTime,
      increment: row.increment,
    };
  }

  private buildPgn(
    row: GameWithPlayers,
    history: readonly string[],
    result: SharedGameResult | undefined,
  ): string {
    const res =
      result === "white" ? "1-0" : result === "black" ? "0-1" : result === "draw" ? "1/2-1/2" : "*";
    return this.engine.generatePGN(history, {
      white: row.whitePlayer.username,
      black: row.blackPlayer?.username ?? "…",
      result: res,
    });
  }

  private buildGameState(
    gameId: string,
    session: GameSessionRecord,
    row: GameWithPlayers,
    status: GameState["status"],
    result: SharedGameResult | undefined,
    lastMove: MoveInput | null,
  ): GameState {
    void result;
    // On expose au client la couleur qui a actuellement une offre de nulle
    // active. Sans ça, l'adversaire ne peut pas voir les boutons
    // "Accepter / Refuser nulle" puisque le store Zustand `drawOfferedBy`
    // ne serait jamais hydraté.
    const drawOfferedBy: PieceColor | null = session.whiteDrawOffer
      ? "w"
      : session.blackDrawOffer
        ? "b"
        : null;
    return {
      gameId,
      fen: session.fen,
      pgn: session.pgn,
      turn: session.currentTurn,
      status,
      whitePlayer: {
        userId: row.whitePlayer.id,
        username: row.whitePlayer.username,
        avatarUrl: row.whitePlayer.avatarUrl,
      },
      blackPlayer: row.blackPlayer
        ? {
            userId: row.blackPlayer.id,
            username: row.blackPlayer.username,
            avatarUrl: row.blackPlayer.avatarUrl,
          }
        : {
            userId: PENDING_BLACK_PLAYER_ID,
            username: "En attente…",
            avatarUrl: null,
          },
      whiteTimeRemaining: session.whiteTimeRemaining,
      blackTimeRemaining: session.blackTimeRemaining,
      lastMove,
      moveCount: session.moveCount,
      drawOfferedBy,
      moveHistory: this.parseSanMovesFromJson(session.moveHistoryJson),
      isCheck: this.engine.isCheck(session.fen),
    };
  }
}
