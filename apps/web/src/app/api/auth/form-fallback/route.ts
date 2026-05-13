import { NextResponse, type NextRequest } from "next/server";

/**
 * Filet de sécurité : si un formulaire d'auth (login/register) est soumis
 * SANS hydratation JS (ex. CSP qui casse le runtime, JS désactivé), le navigateur
 * tomberait par défaut sur GET avec les credentials en query-string.
 *
 * En forçant method="POST" action="/api/auth/form-fallback" sur le <form>, on garantit que :
 *   - les champs partent en body POST, pas en query-string,
 *   - cette route ne lit JAMAIS le body, ne le forwarde nulle part,
 *   - elle redirige immédiatement vers /login?error=NoJsFallback.
 *
 * Quand le JS est actif, e.preventDefault() de react-hook-form empêche
 * la soumission native et cette route n'est jamais atteinte.
 */
function redirectToLogin(req: NextRequest, code: string): NextResponse {
  const url = new URL("/login", req.nextUrl.origin);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url, 303);
}

export function GET(req: NextRequest): NextResponse {
  return redirectToLogin(req, "NoJsFallback");
}

export function POST(req: NextRequest): NextResponse {
  return redirectToLogin(req, "NoJsFallback");
}
