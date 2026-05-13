import { Inject, Injectable, Logger } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS } from "../redis/redis.module";
import { GameSessionRepository } from "./game-session.repository";

@Injectable()
export class AntiCheatService {
  private readonly log = new Logger(AntiCheatService.name);

  constructor(
    private readonly sessionRepo: GameSessionRepository,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async analyzeMove(gameId: string, userId: string, intervalMs: number, moveNumber: number): Promise<void> {
    void moveNumber;
    if (intervalMs <= 0 || intervalMs > 600_000) {
      return;
    }
    await this.sessionRepo.pushMoveTiming(gameId, userId, intervalMs);
    const key = `ac:mv:${gameId}:${userId}`;
    const vals = await this.redis.lrange(key, 0, 9);
    if (vals.length < 10) {
      return;
    }
    const nums = vals.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
    if (nums.length < 10) {
      return;
    }
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((a, x) => a + (x - mean) ** 2, 0) / nums.length;
    const std = Math.sqrt(variance);
    if (std < 50) {
      const c = await this.sessionRepo.incrementSuspicious(gameId, userId);
      if (c >= 5) {
        this.log.warn({ gameId, userId, std, count: c }, "anti_cheat_review");
      }
    }
  }
}
