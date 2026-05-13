import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import type { OAuthProfileInput } from "./auth.types";
import { loginSchema, type LoginDto } from "./dto/login.dto";
import { registerSchema, type RegisterDto } from "./dto/register.dto";

// En production on bride à 5 essais / 15 min pour limiter le credential stuffing.
// En développement, plusieurs onglets/navigateurs partagent la même IP locale
// (`::1`) et la clé de throttle est commune : la limite se sature en quelques
// rechargements de page. On élargit donc fortement la fenêtre dev pour éviter
// les faux 429 qui rendent l'app intestable, sans impacter la prod.
const IS_PROD = process.env.NODE_ENV === "production";
const LOGIN_REGISTER_THROTTLE = IS_PROD
  ? ({ default: { limit: 5, ttl: 900_000, blockDuration: 900_000 } } as const)
  : ({ default: { limit: 100, ttl: 60_000, blockDuration: 60_000 } } as const);
const REFRESH_THROTTLE = IS_PROD
  ? ({ default: { limit: 10, ttl: 300_000, blockDuration: 300_000 } } as const)
  : ({ default: { limit: 200, ttl: 60_000, blockDuration: 60_000 } } as const);

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @Throttle(LOGIN_REGISTER_THROTTLE)
  @ApiOperation({ summary: "Inscription" })
  @ApiResponse({ status: 201, description: "Compte créé" })
  @ApiResponse({ status: 401, description: "Non autorisé" })
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const tokens = await this.auth.register(body, req);
    this.setRefreshCookie(res, tokens.refreshToken);
    return this.buildAuthResponse(req, tokens);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle(LOGIN_REGISTER_THROTTLE)
  @ApiOperation({ summary: "Connexion" })
  @ApiResponse({ status: 200, description: "Jetons émis" })
  @ApiResponse({ status: 401, description: "Identifiants invalides" })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const tokens = await this.auth.login(body, req);
    this.setRefreshCookie(res, tokens.refreshToken);
    return this.buildAuthResponse(req, tokens);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Déconnexion" })
  async logout(
    @Req() req: Request & { user?: { userId: string } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    const raw = this.readRefreshCookie(req);
    await this.auth.logout(userId, raw);
    this.clearRefreshCookie(res);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle(REFRESH_THROTTLE)
  @UseGuards(AuthGuard("jwt-refresh"))
  @ApiOperation({ summary: "Rafraîchir la session" })
  async refresh(
    @Req() req: Request & { user?: { userId: string; email: string; jti: string } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const raw = this.readRefreshCookie(req);
    if (!raw) {
      throw new UnauthorizedException("Session expirée");
    }
    const tokens = await this.auth.refreshTokens(raw, req);
    this.setRefreshCookie(res, tokens.refreshToken);
    return this.buildAuthResponse(req, tokens);
  }

  @Get("google")
  @UseGuards(AuthGuard("google"))
  @ApiOperation({ summary: "Démarrer OAuth Google" })
  googleAuth(): void {
    /* Passport redirige vers Google */
  }

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  @ApiOperation({ summary: "Callback OAuth Google" })
  async googleCallback(
    @Req() req: Request & { user?: OAuthProfileInput },
    @Res() res: Response,
  ): Promise<void> {
    const profile = req.user;
    if (!profile) {
      res.status(401).json({ message: "OAuth invalide" });
      return;
    }
    const tokens = await this.auth.loginWithOAuthProfile(profile, req);
    this.setRefreshCookie(res, tokens.refreshToken);
    res.status(200).json({ accessToken: tokens.accessToken });
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Profil authentifié" })
  async me(@Req() req: Request & { user?: { userId: string } }) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.auth.getAuthProfile(userId);
  }

  private buildAuthResponse(
    req: Request,
    tokens: { accessToken: string; refreshToken: string },
  ): { accessToken: string; refreshToken?: string } {
    const bridge = this.config.get<string>("INTERNAL_AUTH_BRIDGE_SECRET");
    if (bridge && req.header("x-internal-bridge") === bridge) {
      return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    }
    return { accessToken: tokens.accessToken };
  }

  private readRefreshCookie(req: Request): string | undefined {
    const name = this.config.get<string>("REFRESH_COOKIE_NAME") ?? "royal_refresh";
    const v = req.cookies?.[name];
    return typeof v === "string" ? v : undefined;
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    const name = this.config.get<string>("REFRESH_COOKIE_NAME") ?? "royal_refresh";
    const isProd = this.config.get<string>("NODE_ENV") === "production";
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    res.cookie(name, refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      path: "/auth",
      maxAge,
    });
  }

  private clearRefreshCookie(res: Response): void {
    const name = this.config.get<string>("REFRESH_COOKIE_NAME") ?? "royal_refresh";
    const isProd = this.config.get<string>("NODE_ENV") === "production";
    res.clearCookie(name, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      path: "/auth",
    });
  }
}
