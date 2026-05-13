export type RegisterConflictField = "email" | "username";

export function parseRegisterConflictField(body: unknown): RegisterConflictField | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const msg = (body as Record<string, unknown>).message;
  if (msg && typeof msg === "object" && "field" in msg) {
    const f = (msg as { field: unknown }).field;
    if (f === "email" || f === "username") {
      return f;
    }
  }
  return null;
}
