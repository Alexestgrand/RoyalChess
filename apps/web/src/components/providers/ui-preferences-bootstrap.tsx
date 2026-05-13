"use client";

import { useUiStore } from "@/stores/ui.store";
import { useEffect } from "react";

/**
 * Réhydratation Zustand `persist` côté client (Next : `skipHydration: true`).
 * Sans cet appel, l’état reste aux défauts jusqu’au prochain reload.
 */
export function UiPreferencesBootstrap(): null {
  useEffect(() => {
    void (async (): Promise<void> => {
      try {
        await Promise.resolve(useUiStore.persist.rehydrate());
      } finally {
        useUiStore.getState().markPreferencesRehydrated();
      }
    })();
  }, []);
  return null;
}
