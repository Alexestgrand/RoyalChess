import { auth } from "@/auth";
import { NextResponse } from "next/server";

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

/**
 * Chemins publics (sans session) : "/", auth, assets Next, API.
 * Les routes `/api/*` sont exclues du matcher : le middleware ne s'y applique pas.
 */
function isPublicPath(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return true;
  }
  if (pathname.startsWith("/api")) {
    return true;
  }
  if (pathname.startsWith("/_next")) {
    return true;
  }
  return false;
}

function buildCsp(nonce: string): string {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const socket = process.env.NEXT_PUBLIC_SOCKET_URL ?? api;
  const isProd = process.env.NODE_ENV === "production";
  const connect = isProd
    ? ["'self'", api, socket].join(" ")
    : ["'self'", api, socket, "ws:", "wss:"].join(" ");
  const scriptSrc = isProd
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: 'nonce-${nonce}'`;
  const styleSrc = isProd ? "style-src 'self'" : "style-src 'self' 'unsafe-inline'";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    styleSrc,
    scriptSrc,
    `connect-src ${connect}`,
  ].join("; ");
}

function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  return response;
}

export default auth((req) => {
  const nonce = generateNonce();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const { pathname } = req.nextUrl;
  const onAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  if (req.auth && onAuthPage) {
    const res = NextResponse.redirect(new URL("/", req.url));
    return applySecurityHeaders(res, nonce);
  }
  if (!req.auth && !isPublicPath(pathname)) {
    const login = new URL("/login", req.url);
    login.searchParams.set("error", "SessionRequired");
    const returnTo = `${pathname}${req.nextUrl.search}`;
    login.searchParams.set("callbackUrl", returnTo);
    const res = NextResponse.redirect(login);
    return applySecurityHeaders(res, nonce);
  }
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  return applySecurityHeaders(res, nonce);
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
