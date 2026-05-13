import { Inject, Injectable } from "@nestjs/common";
import { GameStatus } from "@prisma/client";
import type Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS } from "../redis/redis.module";

@Injectable()
export class StatsService {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  async getOnlineSnapshot(): Promise<{ onlinePlayers: number; activeGames: number }> {
    const raw = await this.redis.get("stats:ws:connections");
    const onlinePlayers = Math.max(0, Number.parseInt(raw ?? "0", 10) || 0);
    const activeGames = await this.prisma.game.count({
      where: { status: GameStatus.ACTIVE },
    });
    return { onlinePlayers, activeGames };
  }
}
