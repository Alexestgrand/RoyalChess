import NextAuth, { CredentialsSignin } from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

// Erreur dédiée pour propager un code clair côté client (`res.error` après
// `signIn("credentials", { redirect: false })`). Auth.js v5 expose la
// propriété `code` dans la query string ou la réponse JSON.
class RateLimitedSignin extends CredentialsSignin {
  override code = "RateLimited";
}

type LoginApiResult =
  | { kind: "ok"; tokens: { accessToken: string; refreshToken?: string } }
  | { kind: "throttled" }
  | { kind: "invalid" }
  | { kind: "error" };

const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Marge avant l'expiration de l'access token à partir de laquelle on
// déclenche un refresh proactif. 60s offre une fenêtre confortable pour
// couvrir une légère désynchro d'horloge et la latence du round-trip.
const REFRESH_SKEW_MS = 60_000;

function bridgeHeader(): Record<string, string> {
  const bridge = process.env.INTERNAL_AUTH_BRIDGE_SECRET;
  if (!bridge) {
    // Sans ce header, l'API n'inclut pas le refreshToken dans le body, et
    // NextAuth ne peut pas rafraîchir la session : tous les appels Bearer
    // échouent en 401 dès la 16e minute. On log côté serveur pour aider au
    // diagnostic en dev sans bloquer le démarrage.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "[auth] INTERNAL_AUTH_BRIDGE_SECRET manquant : le refresh JWT NextAuth est désactivé.",
      );
    }
    return {};
  }
  return { "x-internal-bridge": bridge };
}

function decodeAccessTokenExpiry(accessToken: string): number | undefined {
  const parts = accessToken.split(".");
  if (parts.length !== 3) {
    return undefined;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1] ?? "", "base64").toString("utf8"),
    ) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

async function loginWithApi(email: string, password: string): Promise<LoginApiResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...bridgeHeader(),
  };
  let res: Response;
  try {
    res = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch {
    return { kind: "error" };
  }
  if (res.status === 429) {
    return { kind: "throttled" };
  }
  if (res.status === 401) {
    return { kind: "invalid" };
  }
  if (!res.ok) {
    return { kind: "error" };
  }
  const tokens = (await res.json()) as { accessToken: string; refreshToken?: string };
  return { kind: "ok", tokens };
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken?: string } | null> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    cookie: `royal_refresh=${refreshToken}`,
    ...bridgeHeader(),
  };
  try {
    const res = await fetch(`${apiUrl}/auth/refresh`, {
      method: "POST",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as { accessToken: string; refreshToken?: string };
  } catch {
    return null;
  }
}

async function fetchMe(accessToken: string): Promise<{
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
} | null> {
  const res = await fetch(`${apiUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as {
    id: string;
    email: string;
    username: string;
    avatarUrl: string | null;
  };
}

const googleId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: async (credentials) => {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) {
          return null;
        }
        const result = await loginWithApi(email, password);
        if (result.kind === "throttled") {
          // Propage un code distinct du classique CredentialsSignin afin que
          // le formulaire affiche un message dédié plutôt que "identifiants
          // incorrects".
          throw new RateLimitedSignin();
        }
        if (result.kind !== "ok") {
          return null;
        }
        const profile = await fetchMe(result.tokens.accessToken);
        if (!profile) {
          return null;
        }
        return {
          id: profile.id,
          email: profile.email,
          name: profile.username,
          username: profile.username,
          image: profile.avatarUrl ?? undefined,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        };
      },
    }),
    ...(googleId && googleSecret
      ? [
          Google({
            clientId: googleId,
            clientSecret: googleSecret,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.userId = user.id;
        const access = (user as { accessToken?: string }).accessToken;
        token.accessToken = access;
        token.refreshToken = (user as { refreshToken?: string }).refreshToken;
        token.accessTokenExpiresAt = access ? decodeAccessTokenExpiry(access) : undefined;
        token.username =
          typeof (user as { username?: string }).username === "string"
            ? (user as { username: string }).username
            : typeof user.name === "string"
              ? user.name
              : undefined;
        token.email = typeof user.email === "string" ? user.email : undefined;
        const img = (user as { image?: string | null }).image;
        token.picture = typeof img === "string" ? img : undefined;
        token.error = undefined;
      }
      if (account?.provider === "google" && account.id_token) {
        token.accessToken = account.id_token;
        token.userId = token.sub ?? undefined;
        token.accessTokenExpiresAt = decodeAccessTokenExpiry(account.id_token);
      }

      if (trigger === "update" && session && typeof session === "object") {
        const s = session as Record<string, unknown>;
        if (typeof s.picture === "string") {
          token.picture = s.picture;
        }
        if (typeof s.email === "string") {
          token.email = s.email;
        }
        if (typeof s.username === "string") {
          token.username = s.username;
        }
      }

      const exp = token.accessTokenExpiresAt;
      const refresh = token.refreshToken;
      const needsRefresh =
        typeof exp === "number" &&
        Date.now() > exp - REFRESH_SKEW_MS &&
        typeof refresh === "string";
      if (needsRefresh && typeof refresh === "string") {
        const refreshed = await refreshAccessToken(refresh);
        if (refreshed) {
          token.accessToken = refreshed.accessToken;
          token.accessTokenExpiresAt = decodeAccessTokenExpiry(refreshed.accessToken);
          if (refreshed.refreshToken) {
            token.refreshToken = refreshed.refreshToken;
          }
          token.error = undefined;
        } else {
          // Refresh impossible : on invalide explicitement l'accessToken
          // pour forcer une nouvelle connexion côté UI plutôt que d'envoyer
          // un Bearer expiré (qui produit des 401 silencieux).
          token.accessToken = undefined;
          token.accessTokenExpiresAt = undefined;
          token.refreshToken = undefined;
          token.error = "RefreshTokenError";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        return session;
      }
      session.user.id = (token.userId as string) ?? session.user.id ?? "";
      session.user.username =
        (token.username as string | undefined) ?? session.user.name ?? session.user.email?.split("@")[0] ?? "";
      if (typeof token.email === "string") {
        session.user.email = token.email;
      }
      if (typeof token.picture === "string") {
        session.user.image = token.picture;
      }
      session.accessToken = token.accessToken as string | undefined;
      if (token.error === "RefreshTokenError") {
        session.accessToken = undefined;
      }
      return session;
    },
  },
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
