import { Inject, Injectable, Logger } from "@nestjs/common";
import type Redis from "ioredis";
import type { GameStatus, PieceColor } from "@royalchess/shared";
import { REDIS } from "../redis/redis.module";
import type { GameSessionRecord } from "./game-session.types";

const TTL_SECONDS = 24 * 60 * 60;

function redisKey(gameId: string): string {
  return `game:${gameId}`;
}

function boolToStr(v: boolean): "0" | "1" {
  return v ? "1" : "0";
}

function strToBool(v: string | undefined): boolean {
  return v === "1";
}

@Injectable()
export class GameSessionRepository {
  private readonly log = new Logger(GameSessionRepository.name);

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async createSession(gameId: string, record: GameSessionRecord): Promise<void> {
    const key = redisKey(gameId);
    await this.redis.hset(key, this.serialize(record));
    await this.redis.expire(key, TTL_SECONDS);
  }

  async getSession(gameId: string): Promise<GameSessionRecord | null> {
    const key = redisKey(gameId);
    const raw = await this.redis.hgetall(key);
    if (!raw || Object.keys(raw).length === 0) {
      return null;
    }
    return this.deserialize(raw);
  }

  async updateSession(gameId: string, patch: Partial<GameSessionRecord>): Promise<boolean> {
    const key = redisKey(gameId);
    const current = await this.getSession(gameId);
    if (!current) {
      this.log.warn({ gameId }, "updateSession: aucune session Redis");
      return false;
    }
    const next: GameSessionRecord = { ...current, ...patch };
    await this.redis.hset(key, this.serialize(next));
    await this.redis.expire(key, TTL_SECONDS);
    return true;
  }

  async deleteSession(gameId: string): Promise<void> {
    await this.redis.del(redisKey(gameId));
  }

  private playingUserKey(userId: string): string {
    return `playing:${userId}`;
  }

  async setUserPlayingGame(userId: string, gameId: string): Promise<void> {
    await this.redis.set(this.playingUserKey(userId), gameId, "EX", TTL_SECONDS);
  }

  async clearUserPlayingGame(userId: string): Promise<void> {
    await this.redis.del(this.playingUserKey(userId));
  }

  async getUserPlayingGame(userId: string): Promise<string | null> {
    const v = await this.redis.get(this.playingUserKey(userId));
    return typeof v === "string" ? v : null;
  }

  async addMoveToHistory(gameId: string, san: string): Promise<void> {
    const session = await this.getSession(gameId);
    if (!session) {
      return;
    }
    const history = this.parseHistory(session.moveHistoryJson);
    history.push(san);
    const saved = await this.updateSession(gameId, { moveHistoryJson: JSON.stringify(history) });
    if (!saved) {
      this.log.warn({ gameId }, "addMoveToHistory: mise à jour session impossible");
    }
  }

  async getFullMoveHistory(gameId: string): Promise<readonly string[]> {
    const session = await this.getSession(gameId);
    if (!session) {
      return [];
    }
    return this.parseHistory(session.moveHistoryJson);
  }

  async setPremove(gameId: string, userId: string, payloadJson: string): Promise<void> {
    const key = `premove:${gameId}:${userId}`;
    await this.redis.set(key, payloadJson, "EX", TTL_SECONDS);
  }

  async deletePremove(gameId: string, userId: string): Promise<void> {
    await this.redis.del(`premove:${gameId}:${userId}`);
  }

  async getPremove(gameId: string, userId: string): Promise<string | null> {
    const v = await this.redis.get(`premove:${gameId}:${userId}`);
    return typeof v === "string" ? v : null;
  }

  async tryReserveChatSlot(gameId: string, userId: string): Promise<boolean> {
    const key = `chat:rl:${gameId}:${userId}`;
    const ok = await this.redis.set(key, "1", "PX", 500, "NX");
    return ok === "OK";
  }

  async addDisconnectDeadline(gameId: string, userId: string, expireAtMs: number): Promise<void> {
    await this.redis.zadd("disconnect_deadline", expireAtMs, `${gameId}:${userId}`);
  }

  async removeDisconnectDeadline(gameId: string, userId: string): Promise<number> {
    return this.redis.zrem("disconnect_deadline", `${gameId}:${userId}`);
  }

  /**
   * Parcourt les sessions Redis `game:*` (SCAN borné) et retourne les
   * `gameId` dont le champ `status` vaut `active`.
   */
  async listActiveSessionGameIds(
    maxGames: number,
    maxScanIterations: number,
  ): Promise<{ readonly ids: readonly string[]; readonly scanIncomplete: boolean }> {
    const ids: string[] = [];
    let cursor = "0";
    let iterations = 0;
    let scanIncomplete = false;
    do {
      if (iterations >= maxScanIterations) {
        scanIncomplete = cursor !== "0";
        break;
      }
      iterations += 1;
      const [nextCursor, keys] = await this.redis.scan(cursor, "MATCH", "game:*", "COUNT", 40);
      cursor = nextCursor;
      for (const key of keys) {
        if (!key.startsWith("game:")) {
          continue;
        }
        const gameId = key.slice("game:".length);
        const status = await this.redis.hget(key, "status");
        if (status === "active" && !ids.includes(gameId)) {
          ids.push(gameId);
          if (ids.length >= maxGames) {
            return { ids, scanIncomplete: cursor !== "0" };
          }
        }
      }
    } while (cursor !== "0");
    return { ids, scanIncomplete };
  }

  async listDisconnectDue(beforeMs: number): Promise<readonly string[]> {
    return this.redis.zrangebyscore("disconnect_deadline", "-inf", String(beforeMs));
  }

  async pushMoveTiming(gameId: string, userId: string, intervalMs: number): Promise<void> {
    const key = `ac:mv:${gameId}:${userId}`;
    await this.redis.lpush(key, String(intervalMs));
    await this.redis.ltrim(key, 0, 19);
    await this.redis.expire(key, TTL_SECONDS);
  }

  async incrementSuspicious(gameId: string, userId: string): Promise<number> {
    const key = `suspicious:${gameId}:${userId}`;
    const v = await this.redis.incr(key);
    await this.redis.expire(key, TTL_SECONDS);
    return v;
  }

  /** Max 2 coups / seconde glissante par joueur et partie (token bucket Redis). */
  async tryConsumeMoveBurst(gameId: string, userId: string): Promise<"ok" | "deny"> {
    const key = `moveburst:${gameId}:${userId}`;
    const now = Date.now();
    const windowStart = now - 1000;
    await this.redis.zremrangebyscore(key, 0, windowStart);
    const before = await this.redis.zcard(key);
    if (before >= 2) {
      return "deny";
    }
    await this.redis.zadd(key, now, `${now}:${Math.random().toString(36).slice(2, 9)}`);
    await this.redis.expire(key, 5);
    return "ok";
  }

  private parseHistory(json: string): string[] {
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

  private serialize(r: GameSessionRecord): Record<string, string> {
    return {
      fen: r.fen,
      pgn: r.pgn,
      status: r.status,
      whitePlayerId: r.whitePlayerId,
      blackPlayerId: r.blackPlayerId,
      whiteTimeRemaining: String(r.whiteTimeRemaining),
      blackTimeRemaining: String(r.blackTimeRemaining),
      increment: String(r.incrementMs),
      lastMoveTimestamp: String(r.lastMoveTimestamp),
      currentTurn: r.currentTurn,
      moveCount: String(r.moveCount),
      moveHistory: r.moveHistoryJson,
      whiteDrawOffer: boolToStr(r.whiteDrawOffer),
      blackDrawOffer: boolToStr(r.blackDrawOffer),
    };
  }

  private deserialize(raw: Record<string, string>): GameSessionRecord {
    return {
      fen: raw.fen ?? "",
      pgn: raw.pgn ?? "",
      status: (raw.status as GameStatus) ?? "active",
      whitePlayerId: raw.whitePlayerId ?? "",
      blackPlayerId: raw.blackPlayerId ?? "",
      whiteTimeRemaining: Number(raw.whiteTimeRemaining ?? 0),
      blackTimeRemaining: Number(raw.blackTimeRemaining ?? 0),
      incrementMs: Number(raw.increment ?? 0),
      lastMoveTimestamp: Number(raw.lastMoveTimestamp ?? 0),
      currentTurn: (raw.currentTurn as PieceColor) ?? "w",
      moveCount: Number(raw.moveCount ?? 0),
      moveHistoryJson: raw.moveHistory ?? "[]",
      whiteDrawOffer: strToBool(raw.whiteDrawOffer),
      blackDrawOffer: strToBool(raw.blackDrawOffer),
    };
  }
}
