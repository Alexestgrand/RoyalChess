"use client";

import type { UserPreferences } from "@royalchess/shared";
import { useAuthStore, type AuthUser } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

function mapSessionUser(
  id: string,
  email: string | null | undefined,
  username: string | null | undefined,
  name: string | null | undefined,
  image: string | null | undefined,
): AuthUser {
  const resolved = typeof username === "string" && username.length > 0 ? username : name ?? "";
  return {
    id,
    email: email ?? "",
    username: resolved,
    avatarUrl: image ?? null,
  };
}

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

export function useSessionSync(): void {
  const { data, status } = useSession();
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const clearUser = useAuthStore((s) => s.clearUser);
  const preferencesRehydrated = useUiStore((s) => s.preferencesRehydrated);
  const setSyncAccessToken = useUiStore((s) => s.setSyncAccessToken);
  const mergeFromServer = useUiStore((s) => s.mergeFromServer);

  useEffect(() => {
    setLoading(status === "loading");
  }, [status, setLoading]);

  useEffect(() => {
    const token = typeof data?.accessToken === "string" ? data.accessToken : undefined;
    setSyncAccessToken(token);
    if (status === "unauthenticated") {
      setSyncAccessToken(undefined);
    }
  }, [data?.accessToken, setSyncAccessToken, status]);

  useEffect(() => {
    if (status === "authenticated" && data?.user?.id) {
      setUser(
        mapSessionUser(
          data.user.id,
          data.user.email,
          data.user.username,
          data.user.name,
          data.user.image,
        ),
      );
    } else if (status === "unauthenticated") {
      clearUser();
    }
  }, [data, status, setUser, clearUser]);

  useEffect(() => {
    if (!preferencesRehydrated || status !== "authenticated") {
      return;
    }
    const token = data?.accessToken;
    if (typeof token !== "string") {
      return;
    }
    let cancelled = false;
    void (async (): Promise<void> => {
      try {
        const res = await fetch(`${apiBase()}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok || cancelled) {
          return;
        }
        const body = (await res.json()) as { preferences?: UserPreferences | null };
        mergeFromServer(body.preferences ?? null);
      } catch {
        /* réseau : on garde le cache local */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preferencesRehydrated, status, data?.accessToken, mergeFromServer]);
}
