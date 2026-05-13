import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    userId?: string;
    user: DefaultSession["user"] & {
      id: string;
      username: string;
    };
  }

  interface User {
    accessToken?: string;
    refreshToken?: string;
    username?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: number;
    userId?: string;
    username?: string;
    error?: "RefreshTokenError";
  }
}
