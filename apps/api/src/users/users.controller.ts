import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { updateProfileSchema, type UpdateProfileDto } from "./dto/update-profile.dto";
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

  @Get(":username")
  getByUsername(@Param("username") username: string) {
    return this.users.getPublicProfile(username);
  }
}
