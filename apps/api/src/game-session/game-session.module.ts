import { Module, forwardRef } from "@nestjs/common";
import { EloModule } from "../elo/elo.module";
import { GamesModule } from "../games/games.module";
import { RedisModule } from "../redis/redis.module";
import { UsersModule } from "../users/users.module";
import { AntiCheatService } from "./anti-cheat.service";
import { ChessEngineModule } from "./chess-engine.module";
import { GameSessionGateway } from "./game-session.gateway";
import { GameSessionRepository } from "./game-session.repository";
import { GameSessionService } from "./game-session.service";

@Module({
  imports: [RedisModule, forwardRef(() => GamesModule), EloModule, ChessEngineModule, UsersModule],
  providers: [GameSessionGateway, GameSessionService, GameSessionRepository, AntiCheatService],
  exports: [GameSessionService, GameSessionRepository],
})
export class GameSessionModule {}
