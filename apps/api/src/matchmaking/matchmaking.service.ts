import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { TimeControl } from "@prisma/client";
import { joinQueueSchema, MATCHMAKING_QUEUE_PRESETS, SocketEvent } from "@royalchess/shared";
import type Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS } from "../redis/redis.module";
import { GameSessionRepository } from "../game-session/game-session.repository";
import { GameSessionService } from "../game-session/game-session.service";
import { GamesRepository, type GameWithPlayers } from "../games/games.repository";
import { MatchmakingGateway } from "./matchmaking.gateway";

interface QueueMeta {
  readonly timeControl: TimeControl;
  readonly initialTime: number;
  readonly increment: number;
  readonly joinedAt: number;
  readonly rating: number;
}

function queueZsetKey(tc: TimeControl, initialTime: number, increment: number): string {
  return `mm:z:${tc}:${initialTime}:${increment}`;
}

function metaKey(userId: string): string {
  return `mm:meta:${userId}`;
}

function sockKey(userId: string): string {
  return `mm:sock:${userId}`;
}

/** Fenêtre Elo ± : 0–10s ±100, 10–20s ±200, 20–30s ±300, 30s+ ±500. */
export function computeMatchmakingEloWindow(joinedAtMs: number, nowMs: number): number {
  const elapsed = nowMs - joinedAtMs;
  if (elapsed < 10_000) {
    return 100;
  }
  if (elapsed < 20_000) {
    return 200;
  }
  if (elapsed < 30_000) {
    return 300;
  }
  return 500;
}

const QUEUE_TTL_MS = 120_000;

@Injectable()
export class MatchmakingService {
  private readonly log = new Logger(MatchmakingService.name);

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly games: GamesRepository,
    private readonly sessions: GameSessionService,
    private readonly sessionRepo: GameSessionRepository,
    @Inject(forwardRef(() => MatchmakingGateway))
    private readonly gateway: MatchmakingGateway,
  ) {}

  async joinQueue(
    userId: string,
    raw: unknown,
    socketId: string,
  ): Promise<
    | { ok: true; timeControl: TimeControl; initialTime: number; increment: number }
    | { ok: false; error: string }
  > {
    const parsed = joinQueueSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "payload_invalide" };
    }
    const timeControl = parsed.data.timeControl as TimeControl;
    const initialTime = parsed.data.initialTime;
    const increment = parsed.data.increment;
    const playing = await this.sessionRepo.getUserPlayingGame(userId);
    if (playing) {
      return { ok: false, error: "session_jeu_active" };
    }
    const active = await this.games.findActiveGameForUser(userId);
    if (active) {
      return { ok: false, error: "deja_en_partie" };
    }
    await this.removeUserFromQueues(userId);
    const ratingRow = await this.prisma.eloRating.findUnique({
      where: { userId_timeControl: { userId, timeControl } },
    });
    const rating = ratingRow?.rating ?? 1200;
    const meta: QueueMeta = { timeControl, initialTime, increment, joinedAt: Date.now(), rating };
    const zkey = queueZsetKey(timeControl, initialTime, increment);
    await this.redis.zadd(zkey, rating, userId);
    await this.redis.set(metaKey(userId), JSON.stringify(meta), "EX", 86_400);
    await this.redis.set(sockKey(userId), socketId, "EX", 86_400);
    await this.tryPair(userId, timeControl, initialTime, increment, rating, meta.joinedAt);
    return { ok: true, timeControl, initialTime, increment };
  }

  async cancelQueue(userId: string): Promise<void> {
    await this.removeUserFromQueues(userId);
  }

  queuePosition(userId: string, timeControl: TimeControl, initialTime: number, increment: number): Promise<number> {
    return this.redis
      .zrank(queueZsetKey(timeControl, initialTime, increment), userId)
      .then((r) => (r === null ? -1 : r + 1));
  }

  estimatedWaitSeconds(position: number): number {
    return Math.max(5, position * 8);
  }

  @Interval(3000)
  sweepQueues(): void {
    void this.processAllQueues();
  }

  private async processAllQueues(): Promise<void> {
    for (const preset of MATCHMAKING_QUEUE_PRESETS) {
      const tc = preset.timeControl as TimeControl;
      const zkey = queueZsetKey(tc, preset.initialTime, preset.increment);
      const ids = await this.redis.zrange(zkey, 0, -1);
      for (const uid of ids) {
        const metaRaw = await this.redis.get(metaKey(uid));
        if (!metaRaw) {
          continue;
        }
        try {
          const meta = JSON.parse(metaRaw) as QueueMeta;
          if (Date.now() - meta.joinedAt > QUEUE_TTL_MS) {
            await this.emitTimeoutAndRemove(uid, meta, zkey);
            continue;
          }
          await this.tryPair(uid, tc, meta.initialTime, meta.increment, meta.rating, meta.joinedAt);
        } catch {
          /* ignore */
        }
      }
    }
  }

  private async emitTimeoutAndRemove(userId: string, meta: QueueMeta, zkey: string): Promise<void> {
    const sock = await this.redis.get(sockKey(userId));
    await this.redis.zrem(zkey, userId);
    await this.redis.del(metaKey(userId), sockKey(userId));
    if (typeof sock === "string" && sock.length > 0) {
      this.gateway.emitToSocket(sock, SocketEvent.QUEUE_TIMEOUT, { message: "queue_timeout" });
    }
  }

  private async removeUserFromQueues(userId: string): Promise<void> {
    const raw = await this.redis.get(metaKey(userId));
    if (raw) {
      try {
        const meta = JSON.parse(raw) as QueueMeta;
        await this.redis.zrem(queueZsetKey(meta.timeControl, meta.initialTime, meta.increment), userId);
      } catch {
        /* ignore */
      }
    }
    await this.redis.del(metaKey(userId), sockKey(userId));
  }

  private async tryPair(
    userId: string,
    timeControl: TimeControl,
    initialTime: number,
    increment: number,
    rating: number,
    joinedAt: number,
  ): Promise<void> {
    const window = computeMatchmakingEloWindow(joinedAt, Date.now());
    const zkey = queueZsetKey(timeControl, initialTime, increment);
    const candidates = await this.redis.zrangebyscore(zkey, rating - window, rating + window);
    for (const otherId of candidates) {
      if (otherId === userId) {
        continue;
      }
      const [a, b] = [userId, otherId].sort();
      const lockKey = `mm:pairlock:${a}:${b}`;
      const locked = await this.redis.set(lockKey, "1", "EX", 5, "NX");
      if (locked !== "OK") {
        continue;
      }
      const s1 = await this.redis.zscore(zkey, userId);
      const s2 = await this.redis.zscore(zkey, otherId);
      if (s1 === null || s2 === null) {
        await this.redis.del(lockKey);
        continue;
      }
      await this.pairUsers(userId, otherId, timeControl, initialTime, increment);
      await this.redis.del(lockKey);
      return;
    }
  }

  private async ratingFor(uid: string, timeControl: TimeControl): Promise<number> {
    const row = await this.prisma.eloRating.findUnique({
      where: { userId_timeControl: { userId: uid, timeControl } },
    });
    return row?.rating ?? 1200;
  }

  private async pairUsers(
    a: string,
    b: string,
    timeControl: TimeControl,
    initialTime: number,
    increment: number,
  ): Promise<void> {
    const sockA = await this.redis.get(sockKey(a));
    const sockB = await this.redis.get(sockKey(b));
    const [ra, rb] = await Promise.all([this.ratingFor(a, timeControl), this.ratingFor(b, timeControl)]);
    const whiteId = ra === rb ? (Math.random() < 0.5 ? a : b) : ra < rb ? a : b;
    const blackId = whiteId === a ? b : a;
    const zkey = queueZsetKey(timeControl, initialTime, increment);
    await this.redis.zrem(zkey, a, b);
    await this.redis.del(metaKey(a), metaKey(b), sockKey(a), sockKey(b));
    const game = await this.games.createFromMatchmaking({
      whitePlayerId: whiteId,
      blackPlayerId: blackId,
      timeControl,
      initialTime,
      increment,
    });
    const full = await this.games.findByIdWithPlayers(game.id);
    if (!full) {
      this.log.error({ gameId: game.id }, "partie_matchmaking_introuvable");
      return;
    }
    await this.sessions.seedSessionForMatchmadeGame(full);
    const socketWhite = whiteId === a ? sockA : sockB;
    const socketBlack = blackId === a ? sockA : sockB;
    const [payloadWhite, payloadBlack] = await Promise.all([
      this.buildMatchFoundPayload(full, whiteId, "white"),
      this.buildMatchFoundPayload(full, blackId, "black"),
    ]);
    this.gateway.emitMatchFound({
      gameId: full.id,
      socketWhite: typeof socketWhite === "string" ? socketWhite : "",
      socketBlack: typeof socketBlack === "string" ? socketBlack : "",
      payloadWhite,
      payloadBlack,
    });
  }

  private async buildMatchFoundPayload(
    game: GameWithPlayers,
    selfId: string,
    myColor: "white" | "black",
  ): Promise<{
    gameId: string;
    myColor: "white" | "black";
    opponent: { id: string; username: string; avatarUrl: string | null; elo: number };
    timeControl: string;
    initialTime: number;
    increment: number;
  }> {
    const opponent = selfId === game.whitePlayerId ? game.blackPlayer : game.whitePlayer;
    if (!opponent) {
      throw new Error("buildMatchFoundPayload: adversaire manquant");
    }
    const eloRow = await this.prisma.eloRating.findUnique({
      where: { userId_timeControl: { userId: opponent.id, timeControl: game.timeControl } },
    });
    return {
      gameId: game.id,
      myColor,
      opponent: {
        id: opponent.id,
        username: opponent.username,
        avatarUrl: opponent.avatarUrl,
        elo: eloRow?.rating ?? 1200,
      },
      timeControl: game.timeControl,
      initialTime: game.initialTime,
      increment: game.increment,
    };
  }

  async getQueueStatusSnapshot(
    userId: string,
    timeControl: TimeControl,
    initialTime: number,
    increment: number,
  ): Promise<{
    position: number;
    estimatedWaitSeconds: number;
    waitingSeconds: number;
  } | null> {
    const pos = await this.queuePosition(userId, timeControl, initialTime, increment);
    if (pos < 0) {
      return null;
    }
    const raw = await this.redis.get(metaKey(userId));
    let joinedAt = Date.now();
    if (raw) {
      try {
        const m = JSON.parse(raw) as QueueMeta;
        joinedAt = m.joinedAt;
      } catch {
        /* ignore */
      }
    }
    return {
      position: pos,
      estimatedWaitSeconds: this.estimatedWaitSeconds(pos),
      waitingSeconds: Math.max(0, Math.floor((Date.now() - joinedAt) / 1000)),
    };
  }
}
