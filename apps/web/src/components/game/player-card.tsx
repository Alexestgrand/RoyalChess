"use client";

import type { GameState } from "@royalchess/shared";
import { Clock } from "lucide-react";
import { memo, useEffect, useRef, useState, type ReactElement } from "react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

export interface PlayerCardProps {
  readonly username: string;
  readonly avatarUrl: string | null;
  readonly eloLabel?: string;
  readonly flagEmoji?: string;
  readonly clockMs: number;
  readonly isActiveClock: boolean;
  readonly materialAdvantage: number;
  readonly align: "top" | "bottom";
  /** Les deux joueurs sont prêts côté serveur (`game_ready`) — le chrono client ne décompte que si vrai. */
  readonly gameReady: boolean;
  /** Statut partie (`waiting` | `active` | …) — le tick ne s’applique qu’en `active`. */
  readonly gameStatus: GameState["status"];
}

function formatSmoothClockLabel(ms: number): string {
  if (ms <= 0) {
    return "0:00";
  }
  if (ms >= 10_000) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  }
  return (ms / 1000).toFixed(1);
}

function smoothClockTextClass(
  ms: number,
  isActive: boolean,
  status: GameState["status"],
  gameReady: boolean,
): string {
  if (ms <= 0) {
    return "text-royal-danger";
  }
  const ticking = gameReady && status === "active" && isActive;
  if (ticking && ms < 10_000) {
    return "text-royal-danger motion-safe:animate-pulse";
  }
  if (ticking && ms < 30_000) {
    return "text-orange-400";
  }
  return "text-royal-ivory";
}

function useSmoothClock(
  remainingMs: number,
  isActive: boolean,
  status: GameState["status"],
  gameReady: boolean,
): number {
  const [displayMs, setDisplayMs] = useState(remainingMs);
  const refMs = useRef(remainingMs);
  const refSyncAt = useRef(Date.now());

  useEffect(() => {
    refMs.current = remainingMs;
    refSyncAt.current = Date.now();
    setDisplayMs(remainingMs);
  }, [remainingMs]);

  useEffect(() => {
    if (!gameReady || status !== "active" || !isActive) {
      setDisplayMs(remainingMs);
      return undefined;
    }
    const id = window.setInterval(() => {
      const elapsed = Date.now() - refSyncAt.current;
      setDisplayMs(Math.max(0, refMs.current - elapsed));
    }, 250);
    return () => window.clearInterval(id);
  }, [gameReady, isActive, remainingMs, status]);

  return displayMs;
}

const PlayerCardImpl = function PlayerCardImpl({
  username,
  avatarUrl,
  eloLabel = "—",
  flagEmoji,
  clockMs,
  isActiveClock,
  materialAdvantage,
  align,
  gameReady,
  gameStatus,
}: PlayerCardProps): ReactElement {
  const displayMs = useSmoothClock(clockMs, isActiveClock, gameStatus, gameReady);
  const label = formatSmoothClockLabel(displayMs);
  const spanClass = smoothClockTextClass(displayMs, isActiveClock, gameStatus, gameReady);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-royal-surface-elevated bg-royal-surface p-3 shadow-inner",
        align === "bottom" && "border-royal-gold/25",
      )}
    >
      <UserAvatar username={username} src={avatarUrl} className="h-11 w-11 shrink-0 border border-royal-surface-elevated" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {flagEmoji ? <span className="text-lg leading-none">{flagEmoji}</span> : null}
          <p className="truncate font-medium text-royal-ivory">{username}</p>
        </div>
        <p className="text-xs text-royal-muted">ELO {eloLabel}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1 font-mono text-lg tabular-nums">
          <Clock className="size-4 text-royal-muted" aria-hidden />
          <span className={cn("min-w-[3.25rem] text-right", spanClass)}>{label}</span>
        </div>
        {materialAdvantage !== 0 ? (
          <span className="text-[10px] text-royal-muted">
            {materialAdvantage > 0 ? "+" : ""}
            {materialAdvantage} pts mat.
          </span>
        ) : null}
      </div>
    </div>
  );
};

export const PlayerCard = memo(PlayerCardImpl);
