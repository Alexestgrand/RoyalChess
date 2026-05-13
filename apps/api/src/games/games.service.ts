import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GameStatus, TimeControl, type Game } from "@prisma/client";
import type { ParsedGame } from "@royalchess/shared";
import { randomInt } from "node:crypto";
import type Redis from "ioredis";
import { GameSessionService } from "../game-session/game-session.service";
import { ChessEngineService } from "../game-session/chess-engine.service";
import { REDIS } from "../redis/redis.module";
import type { CreateGameDto } from "./dto/create-game.dto";
import type { CreatePrivateGameDto } from "./dto/create-private-game.dto";
import { GamesRepository, type GameWithPlayers } from "./games.repository";

export interface PublicGameDetailDto {
  readonly id: string;
  readonly status: GameStatus;
  readonly winner: string | null;
  readonly timeControl: string;
  readonly initialTime: number;
  readonly increment: number;
  readonly pgn: string;
  readonly fen: string | null;
  readonly startedAt: Date | null;
  readonly endedAt: Date | null;
  readonly createdAt: Date;
  readonly whitePlayer: { readonly id: string; readonly username: string; readonly avatarUrl: string | null };
  readonly blackPlayer: { readonly id: string; readonly username: string; readonly avatarUrl: string | null };
}

const INVITE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomInviteCode(): string {
  let s = "";
  for (let i = 0; i < 8; i += 1) {
    s += INVITE_CHARS[randomInt(0, INVITE_CHARS.length)] ?? "X";
  }
  return s;
}

function privateSeatRedisKey(gameId: string): string {
  return `private:seat:${gameId}`;
}

@Injectable()
export class GamesService {
  constructor(
    private readonly games: GamesRepository,
    private readonly engine: ChessEngineService,
    @Inject(forwardRef(() => GameSessionService))
    private readonly sessions: GameSessionService,
    private readonly config: ConfigService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async createGame(userId: string, dto: CreateGameDto): Promise<Game> {
    if (dto.opponentId === userId) {
      throw new ForbiddenException("Impossible de jouer contre soi-même");
    }
    return this.games.create({ whitePlayerId: userId, blackPlayerId: dto.opponentId });
  }

  async createPrivateGame(
    userId: string,
    dto: CreatePrivateGameDto,
  ): Promise<{ gameId: string; inviteCode: string; inviteUrl: string }> {
    const tc = dto.timeControl as TimeControl;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = randomInviteCode();
      const existing = await this.games.findByInviteCode(code);
      if (existing) {
        continue;
      }
      const row = await this.games.createPrivateWaiting({
        whitePlayerId: userId,
        timeControl: tc,
        initialTime: dto.initialTime,
        increment: dto.increment,
        inviteCode: code,
      });
      const hostIsWhite =
        dto.preferredColor === "white"
          ? true
          : dto.preferredColor === "black"
            ? false
            : randomInt(0, 2) === 1;
      await this.redis.set(privateSeatRedisKey(row.id), hostIsWhite ? "1" : "0", "EX", 86_400);
      const base =
        this.config.get<string>("WEB_APP_PUBLIC_URL") ??
        this.config.get<string>("CORS_ORIGIN")?.split(",")[0]?.trim() ??
        "http://localhost:3000";
      const inviteUrl = `${base.replace(/\/$/, "")}/game/${row.id}?invite=${encodeURIComponent(code)}`;
      return { gameId: row.id, inviteCode: code, inviteUrl };
    }
    throw new ConflictException("invite_generation_failed");
  }

  async joinPrivateByInvite(
    userId: string,
    inviteCode: string,
  ): Promise<{
    gameId: string;
    myColor: "white" | "black";
    opponent: { id: string; username: string; avatarUrl: string | null };
  }> {
    const row = await this.games.findByInviteCodeWithPlayers(inviteCode);
    if (!row) {
      throw new NotFoundException("code_invalide");
    }
    if (row.status !== GameStatus.WAITING || row.blackPlayerId) {
      throw new ForbiddenException("partie_non_disponible");
    }
    if (row.whitePlayerId === userId) {
      throw new ForbiddenException("impossible_rejoindre_sa_table");
    }
    const seatRaw = await this.redis.get(privateSeatRedisKey(row.id));
    const hostIsWhite = seatRaw !== "0";
    await this.redis.del(privateSeatRedisKey(row.id));
    await this.sessions.clearRedisSession(row.id);
    const full = hostIsWhite
      ? await this.games.assignSecondPlayerAndActivate(row.id, userId)
      : await this.games.assignJoinerAsWhiteAndActivate(row.id, userId);
    await this.sessions.seedSessionForMatchmadeGame(full);
    if (!full.blackPlayer) {
      throw new ForbiddenException("partie_non_disponible");
    }
    // Le créateur de la partie privée est déjà connecté au socket /game
    // avec un state périmé (`status: "waiting"`, blackPlayer absent). On
    // pousse le nouveau snapshot à toute la room pour qu'il sorte de
    // l'overlay "En attente de l'adversaire" sans avoir à recharger.
    await this.sessions.broadcastStateToRoom(full.id);
    const myColor: "white" | "black" = hostIsWhite ? "black" : "white";
    const opponent =
      myColor === "black"
        ? {
            id: full.whitePlayer.id,
            username: full.whitePlayer.username,
            avatarUrl: full.whitePlayer.avatarUrl,
          }
        : {
            id: full.blackPlayer.id,
            username: full.blackPlayer.username,
            avatarUrl: full.blackPlayer.avatarUrl,
          };
    return {
      gameId: full.id,
      myColor,
      opponent,
    };
  }

  async list(userId: string): Promise<Game[]> {
    return this.games.listForUser(userId);
  }

  async exportPgn(gameId: string, userId: string): Promise<{ pgn: string }> {
    const game = await this.games.findById(gameId);
    if (!game || (game.whitePlayerId !== userId && game.blackPlayerId !== userId)) {
      throw new ForbiddenException("Partie introuvable");
    }
    return { pgn: game.pgn };
  }

  async getPublicFinishedGame(gameId: string): Promise<PublicGameDetailDto> {
    const g = await this.requireFinishedWithPlayers(gameId);
    return this.toPublicDto(g);
  }

  async getPublicPgnFile(gameId: string): Promise<{ filename: string; body: string }> {
    const g = await this.requireFinishedWithPlayers(gameId);
    const black = g.blackPlayer;
    if (!black) {
      throw new NotFoundException("Partie introuvable");
    }
    const safeWhite = g.whitePlayer.username.replace(/[^\w-]+/g, "_");
    const safeBlack = black.username.replace(/[^\w-]+/g, "_");
    return {
      filename: `${safeWhite}_vs_${safeBlack}_${g.id}.pgn`,
      body: g.pgn.length > 0 ? g.pgn : this.engine.generatePGN([], {
        white: g.whitePlayer.username,
        black: black.username,
        result: "*",
      }),
    };
  }

  async getPublicAnalysis(gameId: string): Promise<ParsedGame> {
    const g = await this.requireFinishedWithPlayers(gameId);
    if (!g.pgn || g.pgn.trim().length === 0) {
      throw new NotFoundException("Aucun PGN pour cette partie");
    }
    return this.engine.parsePGN(g.pgn);
  }

  private async requireFinishedWithPlayers(gameId: string): Promise<GameWithPlayers> {
    const g = await this.games.findByIdWithPlayers(gameId);
    if (!g) {
      throw new NotFoundException("Partie introuvable");
    }
    const finished =
      g.status === GameStatus.COMPLETED ||
      g.status === GameStatus.DRAW ||
      g.status === GameStatus.ABANDONED;
    if (!finished) {
      throw new ForbiddenException("Partie non terminée ou non publique");
    }
    if (!g.blackPlayer) {
      throw new NotFoundException("Partie introuvable");
    }
    return g;
  }

  private toPublicDto(g: GameWithPlayers): PublicGameDetailDto {
    if (!g.blackPlayer) {
      throw new NotFoundException("Partie introuvable");
    }
    return {
      id: g.id,
      status: g.status,
      winner: g.winner,
      timeControl: g.timeControl,
      initialTime: g.initialTime,
      increment: g.increment,
      pgn: g.pgn,
      fen: g.fen,
      startedAt: g.startedAt,
      endedAt: g.endedAt,
      createdAt: g.createdAt,
      whitePlayer: {
        id: g.whitePlayer.id,
        username: g.whitePlayer.username,
        avatarUrl: g.whitePlayer.avatarUrl,
      },
      blackPlayer: {
        id: g.blackPlayer.id,
        username: g.blackPlayer.username,
        avatarUrl: g.blackPlayer.avatarUrl,
      },
    };
  }
}
