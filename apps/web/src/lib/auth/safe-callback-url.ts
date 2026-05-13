/**
 * Restreint la redirection post-login aux chemins relatifs même origine (open redirect).
 */
export function safeCallbackPath(callbackUrl: string | null | undefined, origin: string): string {
  const fallback = "/";
  if (!callbackUrl || callbackUrl.length === 0) {
    return fallback;
  }
  try {
    const u = new URL(callbackUrl, origin);
    if (u.origin !== new URL(origin).origin) {
      return fallback;
    }
    return `${u.pathname}${u.search}${u.hash}` || fallback;
  } catch {
    return fallback;
  }
}
