import { Module } from "@nestjs/common";
import { GamesModule } from "../games/games.module";
import { AvatarUploadService } from "./avatar-upload.service";
import { AvatarsPublicController } from "./avatars-public.controller";
import { UsersController } from "./users.controller";
import { UsersPublicController } from "./users-public.controller";
import { UsersRepository } from "./users.repository";
import { UsersService } from "./users.service";

@Module({
  imports: [GamesModule],
  controllers: [UsersPublicController, AvatarsPublicController, UsersController],
  providers: [UsersService, UsersRepository, AvatarUploadService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
