import type { UserPreferences } from "@royalchess/shared";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

export async function patchUserPreferences(accessToken: string, body: UserPreferences): Promise<void> {
  const res = await fetch(`${apiBase()}/users/me/preferences`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`preferences_patch_failed:${res.status}`);
  }
}
