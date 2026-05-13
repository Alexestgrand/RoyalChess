export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { method?: HttpMethod } = {},
): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}
