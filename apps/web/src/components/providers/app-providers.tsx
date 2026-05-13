"use client";

/** Fournit NextAuth + réhydratation des préférences UI (`skipHydration`) + synchro session. */
import { SessionSyncBoundary } from "@/components/auth/session-sync-boundary";
import { HtmlUiDatasetSync } from "@/components/providers/html-ui-dataset-sync";
import { UiPreferencesBootstrap } from "@/components/providers/ui-preferences-bootstrap";
import { SessionProvider } from "next-auth/react";
import type { ReactElement, ReactNode } from "react";

export function AppProviders({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <SessionProvider>
      <UiPreferencesBootstrap />
      <SessionSyncBoundary />
      <HtmlUiDatasetSync />
      {children}
    </SessionProvider>
  );
}
