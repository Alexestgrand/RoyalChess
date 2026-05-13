"use client";

import { SessionSyncBoundary } from "@/components/auth/session-sync-boundary";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function AppProviders({ children }: Readonly<{ children: ReactNode }>): React.ReactElement {
  return (
    <SessionProvider>
      <SessionSyncBoundary />
      {children}
    </SessionProvider>
  );
}
