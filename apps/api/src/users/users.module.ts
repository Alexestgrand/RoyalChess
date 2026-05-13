import { Module } from "@nestjs/common";
import { GamesModule } from "../games/games.module";
import { UsersController } from "./users.controller";
import { UsersPublicController } from "./users-public.controller";
import { UsersRepository } from "./users.repository";
import { UsersService } from "./users.service";

@Module({
  imports: [GamesModule],
  controllers: [UsersPublicController, UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
