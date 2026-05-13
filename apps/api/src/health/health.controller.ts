import { Controller, Get, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS } from "../redis/redis.module";
import type Redis from "ioredis";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get()
  async check(): Promise<{ status: string; database: boolean; redis: boolean }> {
    let database = false;
    let redisOk = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = true;
    } catch {
      database = false;
    }
    try {
      const pong = await this.redis.ping();
      redisOk = pong === "PONG";
    } catch {
      redisOk = false;
    }
    const status = database && redisOk ? "ok" : "degraded";
    return { status, database, redis: redisOk };
  }
}
