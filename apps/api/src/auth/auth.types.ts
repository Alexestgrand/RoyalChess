export interface AccessJwtPayload {
  readonly sub: string;
  readonly email: string;
  readonly typ: "access";
}

export interface RefreshJwtPayload {
  readonly sub: string;
  readonly email: string;
  readonly typ: "refresh";
  readonly jti: string;
}

export interface OAuthProfileInput {
  readonly provider: "GOOGLE" | "GITHUB";
  readonly providerAccountId: string;
  readonly email: string;
  readonly displayName?: string;
  readonly picture?: string;
  readonly accessToken?: string;
  readonly refreshToken?: string;
  readonly expiresAt?: Date | null;
}
