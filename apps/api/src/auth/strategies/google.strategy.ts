import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy, VerifyCallback } from "passport-google-oauth20";
import type { OAuthProfileInput } from "../auth.types";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(config: ConfigService) {
    const clientID = config.get<string>("GOOGLE_CLIENT_ID") || "disabled";
    const clientSecret = config.get<string>("GOOGLE_CLIENT_SECRET") || "disabled";
    super({
      clientID,
      clientSecret,
      callbackURL: config.get<string>("GOOGLE_CALLBACK_URL") ?? "http://localhost:3001/auth/google/callback",
      scope: ["email", "profile"],
      state: true,
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error("Email Google manquant"), undefined);
      return;
    }
    const photo = profile.photos?.[0]?.value;
    const input: OAuthProfileInput = {
      provider: "GOOGLE",
      providerAccountId: profile.id,
      email,
      displayName: profile.displayName ?? undefined,
      picture: photo,
      accessToken,
      refreshToken,
      expiresAt: null,
    };
    done(null, input);
  }
}
