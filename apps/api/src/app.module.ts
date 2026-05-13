import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import type Redis from "ioredis";
import { LoggerModule } from "nestjs-pino";
import { AuthModule } from "./auth/auth.module";
import { OriginGuard } from "./common/guards/origin.guard";
import { RedisThrottlerStorage } from "./common/throttler/redis-throttler.storage";
import { AppConfigModule } from "./config/config.module";
import { EloModule } from "./elo/elo.module";
import { GameSessionModule } from "./game-session/game-session.module";
import { GamesModule } from "./games/games.module";
import { HealthModule } from "./health/health.module";
import { MatchmakingModule } from "./matchmaking/matchmaking.module";
import { MetricsModule } from "./metrics/metrics.module";
import { PrismaModule } from "./prisma/prisma.module";
import { REDIS, RedisModule } from "./redis/redis.module";
import { StatsModule } from "./stats/stats.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    AppConfigModule,
    ScheduleModule.forRoot(),
    RedisModule,
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>("NODE_ENV") === "production";
        return {
          pinoHttp: {
            level: isProd ? "info" : "debug",
            transport: isProd
              ? undefined
              : {
                  target: "pino-pretty",
                  options: { singleLine: true, colorize: true },
                },
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [REDIS],
      useFactory: (redis: Redis) => ({
        storage: new RedisThrottlerStorage(redis),
        throttlers: [{ name: "default", ttl: 60_000, limit: 200 }],
      }),
    }),
    PrismaModule,
    HealthModule,
    MetricsModule,
    StatsModule,
    AuthModule,
    UsersModule,
    GamesModule,
    MatchmakingModule,
    GameSessionModule,
    EloModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
