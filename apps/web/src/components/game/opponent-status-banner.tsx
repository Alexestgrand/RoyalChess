"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState, type ReactElement } from "react";
import { useGameStore } from "@/stores/game.store";

export function OpponentStatusBanner(): ReactElement | null {
  const payload = useGameStore((s) => s.opponentDisconnected);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!payload) {
      return undefined;
    }
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [payload]);

  if (!payload) {
    return null;
  }

  const secondsLeft = Math.max(0, Math.ceil((payload.forfeitAt - now) / 1000));

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="sticky top-0 z-30 mb-2 flex w-full items-center gap-2 rounded-lg border border-royal-danger/40 bg-royal-danger/15 px-3 py-2 text-sm text-royal-danger shadow-md"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      <p className="font-medium">
        Adversaire déconnecté — la partie sera abandonnée dans {secondsLeft}s
      </p>
    </div>
  );
}
