import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { OAuthProvider, Prisma, UserRole } from "@prisma/client";
import { parseStoredUserPreferences, type UserPreferences } from "@royalchess/shared";
import { PrismaService } from "../prisma/prisma.service";
import { INITIAL_ELO_TIME_CONTROLS } from "./constants/elo-init.constants";
import { sha256Hex } from "./auth-hash";
import type { OAuthProfileInput, RefreshJwtPayload } from "./auth.types";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";

export interface TokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto, req?: Request): Promise<TokenPair> {
    const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (emailTaken) {
      throw new ConflictException({ field: "email" as const });
    }
    const usernameTaken = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (usernameTaken) {
      throw new ConflictException({ field: "username" as const });
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          passwordHash,
          role: UserRole.USER,
        },
      });
      const ratings: Prisma.EloRatingCreateManyInput[] = INITIAL_ELO_TIME_CONTROLS.map((timeControl) => ({
        userId: u.id,
        timeControl,
        rating: 1200,
        ratingDeviation: 350,
        volatility: 0.06,
        gamesPlayed: 0,
      }));
      await tx.eloRating.createMany({ data: ratings });
      return u;
    });
    return this.issueTokenPair(user.id, user.email, this.metaFromRequest(req), {
      revokeOtherSessions: true,
    });
  }

  async loginWithOAuthProfile(profile: OAuthProfileInput, req: Request): Promise<TokenPair> {
    const user = await this.validateOAuthUser(profile);
    return this.issueTokenPair(user.id, user.email, this.metaFromRequest(req), {
      revokeOtherSessions: true,
    });
  }

  async login(dto: LoginDto, req?: Request): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const invalid = new UnauthorizedException("Identifiants invalides");
    if (!user || !user.passwordHash || !user.isActive || user.role === UserRole.BANNED) {
      throw invalid;
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw invalid;
    }
    return this.issueTokenPair(user.id, user.email, this.metaFromRequest(req), {
      revokeOtherSessions: true,
    });
  }

  async refreshTokens(rawRefresh: string, req?: Request): Promise<TokenPair> {
    const refreshSecret = this.config.getOrThrow<string>("JWT_REFRESH_SECRET");
    let payload: RefreshJwtPayload;
    try {
      payload = this.jwt.verify<RefreshJwtPayload>(rawRefresh, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException("Session expirée");
    }
    if (payload.typ !== "refresh") {
      throw new UnauthorizedException("Session expirée");
    }
    const hash = sha256Hex(rawRefresh);
    const row = await this.prisma.refreshToken.findFirst({
      where: { jti: payload.jti, userId: payload.sub, isRevoked: false },
    });
    if (!row || !this.safeEqualHash(row.tokenHash, hash)) {
      throw new UnauthorizedException("Session expirée");
    }
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { isRevoked: true },
    });
    return this.issueTokenPair(payload.sub, payload.email, this.metaFromRequest(req), {
      revokeOtherSessions: false,
    });
  }

  async logout(userId: string, rawRefresh: string | undefined): Promise<void> {
    if (!rawRefresh) {
      return;
    }
    const refreshSecret = this.config.getOrThrow<string>("JWT_REFRESH_SECRET");
    try {
      const payload = this.jwt.verify<RefreshJwtPayload>(rawRefresh, { secret: refreshSecret });
      if (payload.sub !== userId) {
        return;
      }
      const hash = sha256Hex(rawRefresh);
      await this.prisma.refreshToken.updateMany({
        where: { jti: payload.jti, userId, tokenHash: hash, isRevoked: false },
        data: { isRevoked: true },
      });
    } catch {
      return;
    }
  }

  async validateOAuthUser(input: OAuthProfileInput): Promise<{ id: string; email: string }> {
    const provider =
      input.provider === "GOOGLE" ? OAuthProvider.GOOGLE : OAuthProvider.GITHUB;
    const existing = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: input.providerAccountId,
        },
      },
      include: { user: true },
    });
    if (existing) {
      return { id: existing.user.id, email: existing.user.email };
    }
    const baseUsername = this.slugUsername(input.email.split("@")[0] ?? "player");
    const username = await this.allocateUsername(baseUsername);
    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: input.email,
          username,
          passwordHash: null,
          avatarUrl: input.picture ?? null,
          role: UserRole.USER,
        },
      });
      await tx.oAuthAccount.create({
        data: {
          userId: u.id,
          provider,
          providerAccountId: input.providerAccountId,
          accessToken: input.accessToken ?? null,
          refreshToken: input.refreshToken ?? null,
          expiresAt: input.expiresAt ?? null,
        },
      });
      const ratings: Prisma.EloRatingCreateManyInput[] = INITIAL_ELO_TIME_CONTROLS.map((timeControl) => ({
        userId: u.id,
        timeControl,
        rating: 1200,
        ratingDeviation: 350,
        volatility: 0.06,
        gamesPlayed: 0,
      }));
      await tx.eloRating.createMany({ data: ratings });
      return u;
    });
    return { id: user.id, email: user.email };
  }

  async getAuthProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        preferences: true,
        eloRatings: { select: { timeControl: true, rating: true, gamesPlayed: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException("Non authentifié");
    }
    const preferences: UserPreferences | null =
      user.preferences === null || user.preferences === undefined
        ? null
        : parseStoredUserPreferences(user.preferences as unknown);
    return { ...user, preferences };
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    meta: { userAgent: string | null; ipAddress: string | null },
    opts: { revokeOtherSessions: boolean } = { revokeOtherSessions: false },
  ): Promise<TokenPair> {
    if (opts.revokeOtherSessions) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }
    const accessSecret = this.config.getOrThrow<string>("JWT_ACCESS_SECRET");
    const refreshSecret = this.config.getOrThrow<string>("JWT_REFRESH_SECRET");
    const accessExpires = this.config.getOrThrow<string>("JWT_ACCESS_EXPIRES");
    const refreshExpires = this.config.getOrThrow<string>("JWT_REFRESH_EXPIRES");
    const accessToken = this.jwt.sign(
      { sub: userId, email, typ: "access" },
      { secret: accessSecret, expiresIn: accessExpires },
    );
    const jti = randomUUID();
    const refreshToken = this.jwt.sign(
      { sub: userId, email, typ: "refresh", jti },
      { secret: refreshSecret, expiresIn: refreshExpires },
    );
    const tokenHash = sha256Hex(refreshToken);
    const expiresAt = this.computeExpiry(refreshExpires);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        jti,
        tokenHash,
        expiresAt,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });
    return { accessToken, refreshToken };
  }

  private computeExpiry(refreshExpires: string): Date {
    const match = /^(\d+)([dhms])$/.exec(refreshExpires.trim());
    if (!match) {
      return new Date(Date.now() + 7 * 86400_000);
    }
    const n = Number(match[1]);
    const u = match[2];
    const mult = u === "d" ? 86400_000 : u === "h" ? 3600_000 : u === "m" ? 60_000 : 1000;
    return new Date(Date.now() + n * mult);
  }

  private metaFromRequest(req: Request | undefined): {
    userAgent: string | null;
    ipAddress: string | null;
  } {
    if (!req) {
      return { userAgent: null, ipAddress: null };
    }
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      typeof forwarded === "string"
        ? forwarded.split(",")[0]?.trim() ?? null
        : Array.isArray(forwarded)
          ? forwarded[0] ?? null
          : req.ip ?? null;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null;
    return { userAgent: ua, ipAddress: ip };
  }

  private safeEqualHash(stored: string, computed: string): boolean {
    try {
      const a = Buffer.from(stored, "hex");
      const b = Buffer.from(computed, "hex");
      if (a.length !== b.length) {
        return false;
      }
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  private async allocateUsername(base: string): Promise<string> {
    let candidate = base.slice(0, 20);
    let n = 0;
    while (await this.prisma.user.findUnique({ where: { username: candidate } })) {
      n += 1;
      const suffix = `_${n}`;
      candidate = `${base.slice(0, Math.max(1, 20 - suffix.length))}${suffix}`;
    }
    return candidate;
  }

  private slugUsername(raw: string): string {
    const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
    const base = cleaned.length >= 3 ? cleaned : `user_${cleaned}`;
    return base.slice(0, 20);
  }
}
