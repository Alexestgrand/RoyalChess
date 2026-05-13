import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { eloHistoryQuerySchema, type EloHistoryQueryDto } from "./dto/elo-history-query.dto";
import { updatePasswordSchema, type UpdatePasswordDto } from "./dto/update-password.dto";
import { updateProfileSchema, type UpdateProfileDto } from "./dto/update-profile.dto";
import { updateUserPreferencesSchema, type UpdateUserPreferencesDto } from "./dto/update-user-preferences.dto";
import { UsersService } from "./users.service";

@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me/games")
  @UseGuards(JwtAuthGuard)
  async myGames(
    @CurrentUser() userId: string | undefined,
    @Query("page") pageRaw?: string,
    @Query("limit") limitRaw?: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException();
    }
    const page = Number(pageRaw ?? "1");
    const limit = Number(limitRaw ?? "20");
    return this.users.getGameHistory(userId, page, limit);
  }

  @Patch("me/avatar")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadMyAvatar(
    @CurrentUser() userId: string | undefined,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!userId) {
      throw new UnauthorizedException();
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException({ code: "avatar_file_required" });
    }
    return this.users.uploadAvatarBuffer(userId, file.buffer);
  }

  @Patch("me/password")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  updateMyPassword(
    @CurrentUser() userId: string | undefined,
    @Body(new ZodValidationPipe(updatePasswordSchema)) body: UpdatePasswordDto,
  ): Promise<void> {
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.users.changePassword(userId, body);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() userId: string | undefined,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.users.updateProfile(userId, body);
  }

  @Patch("me/preferences")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  updateMyPreferences(
    @CurrentUser() userId: string | undefined,
    @Body(new ZodValidationPipe(updateUserPreferencesSchema)) body: UpdateUserPreferencesDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.users.patchPreferences(userId, body);
  }

  @Get(":username/stats")
  publicStats(@Param("username") username: string) {
    return this.users.getPublicUserStats(username);
  }

  @Get(":username/elo-history")
  publicEloHistory(
    @Param("username") username: string,
    @Query(new ZodValidationPipe(eloHistoryQuerySchema)) query: EloHistoryQueryDto,
  ) {
    return this.users.getPublicEloHistory(username, query);
  }

  // Important : déclarer cette route AVANT `:username` pour que NestJS
  // matche `/users/foo/games` sur ce handler et non sur `getByUsername`.
  @Get(":username/games")
  publicGames(
    @Param("username") username: string,
    @Query("page") pageRaw?: string,
    @Query("limit") limitRaw?: string,
  ) {
    const page = Number(pageRaw ?? "1");
    const limit = Number(limitRaw ?? "20");
    return this.users.getPublicGameHistory(username, page, limit);
  }

  @Get(":username")
  getByUsername(@Param("username") username: string) {
    return this.users.getPublicProfile(username);
  }
}
