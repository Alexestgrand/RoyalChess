import { Module, forwardRef } from "@nestjs/common";
import { GameSessionModule } from "../game-session/game-session.module";
import { GamesModule } from "../games/games.module";
import { RedisModule } from "../redis/redis.module";
import { MatchmakingGateway } from "./matchmaking.gateway";
import { MatchmakingService } from "./matchmaking.service";

@Module({
  imports: [RedisModule, GamesModule, forwardRef(() => GameSessionModule)],
  providers: [MatchmakingGateway, MatchmakingService],
})
export class MatchmakingModule {}
