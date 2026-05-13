import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import type { RefreshJwtPayload } from "../auth.types";

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(config: ConfigService) {
    const cookieName = config.get<string>("REFRESH_COOKIE_NAME") ?? "royal_refresh";
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null => {
          const fromCookie = req.cookies?.[cookieName];
          if (typeof fromCookie === "string") {
            return fromCookie;
          }
          const body = req.body as { refreshToken?: unknown };
          return typeof body?.refreshToken === "string" ? body.refreshToken : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_REFRESH_SECRET"),
    });
  }

  validate(payload: RefreshJwtPayload): { userId: string; email: string; jti: string } {
    if (payload.typ !== "refresh") {
      throw new UnauthorizedException();
    }
    return { userId: payload.sub, email: payload.email, jti: payload.jti };
  }
}
