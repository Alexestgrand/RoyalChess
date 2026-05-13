"use client";

import { useAuthStore, type AuthUser } from "@/stores/auth.store";
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

export function useSessionSync(): void {
  const { data, status } = useSession();
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const clearUser = useAuthStore((s) => s.clearUser);

  useEffect(() => {
    setLoading(status === "loading");
  }, [status, setLoading]);

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
}
