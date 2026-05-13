import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { cuidSchema } from "@royalchess/shared";
import { JwtAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { createPrivateGameSchema, inviteCodeParamSchema, type CreatePrivateGameDto } from "./dto/create-private-game.dto";
import { createGameSchema, type CreateGameDto } from "./dto/create-game.dto";
import { GamesService } from "./games.service";

@Controller("games")
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() userId: string | undefined) {
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.games.list(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() userId: string | undefined,
    @Body(new ZodValidationPipe(createGameSchema)) body: CreateGameDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.games.createGame(userId, body);
  }

  @Post("private")
  @UseGuards(JwtAuthGuard)
  createPrivate(
    @CurrentUser() userId: string | undefined,
    @Body(new ZodValidationPipe(createPrivateGameSchema)) body: CreatePrivateGameDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.games.createPrivateGame(userId, body);
  }

  @Get("join/:inviteCode")
  @UseGuards(JwtAuthGuard)
  joinPrivate(
    @CurrentUser() userId: string | undefined,
    @Param("inviteCode", new ZodValidationPipe(inviteCodeParamSchema)) inviteCode: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.games.joinPrivateByInvite(userId, inviteCode);
  }

  @Get(":gameId/pgn")
  async downloadPgn(
    @Param("gameId", new ZodValidationPipe(cuidSchema)) gameId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { filename, body } = await this.games.getPublicPgnFile(gameId);
    res.setHeader("Content-Type", "application/x-chess-pgn");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(body);
  }

  @Get(":gameId/analysis")
  analysis(@Param("gameId", new ZodValidationPipe(cuidSchema)) gameId: string) {
    return this.games.getPublicAnalysis(gameId);
  }

  @Get(":gameId")
  detail(@Param("gameId", new ZodValidationPipe(cuidSchema)) gameId: string) {
    return this.games.getPublicFinishedGame(gameId);
  }
}
