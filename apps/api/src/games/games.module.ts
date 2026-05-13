import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ChessEngineModule } from "../game-session/chess-engine.module";
import { GameSessionModule } from "../game-session/game-session.module";
import { GamesController } from "./games.controller";
import { GamesRepository } from "./games.repository";
import { GamesService } from "./games.service";

@Module({
  imports: [ChessEngineModule, ConfigModule, forwardRef(() => GameSessionModule)],
  controllers: [GamesController],
  providers: [GamesService, GamesRepository],
  exports: [GamesRepository],
})
export class GamesModule {}
