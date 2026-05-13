"use client";

import { useSessionSync } from "@/hooks/use-session-sync";

/** Synchronise la session NextAuth vers le store Zustand (monté une fois via `AppProviders`). */
export function SessionSyncBoundary(): null {
  useSessionSync();
  return null;
}
