import { Logger } from "@nestjs/common";
import { ThrottlerStorage } from "@nestjs/throttler";
import type Redis from "ioredis";

interface ThrottlerStorageRecord {
  readonly totalHits: number;
  readonly timeToExpire: number;
  readonly isBlocked: boolean;
  readonly timeToBlockExpire: number;
}

/**
 * Stockage distribué pour @nestjs/throttler (fenêtre + blocage) sur Redis.
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly log = new Logger(RedisThrottlerStorage.name);

  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitKey = `throttle:hit:${throttlerName}:${key}`;
    const blockKey = `throttle:block:${throttlerName}:${key}`;

    const blockTtl = await this.redis.pttl(blockKey);
    if (blockTtl > 0) {
      return {
        totalHits: limit + 1,
        timeToExpire: 0,
        isBlocked: true,
        timeToBlockExpire: blockTtl,
      };
    }

    const n = await this.redis.incr(hitKey);
    if (n === 1) {
      await this.redis.pexpire(hitKey, ttl);
    }
    const timeToExpire = Math.max(0, await this.redis.pttl(hitKey));

    if (n > limit) {
      await this.redis.set(blockKey, "1", "PX", blockDuration);
      await this.redis.del(hitKey);
      this.log.warn({ throttlerName, key }, "limite_throttle_depassee");
      return {
        totalHits: n,
        timeToExpire,
        isBlocked: true,
        timeToBlockExpire: blockDuration,
      };
    }

    return {
      totalHits: n,
      timeToExpire,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
