"use client";

import { Clock } from "lucide-react";
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
}

function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function PlayerCard({
  username,
  avatarUrl,
  eloLabel = "—",
  flagEmoji,
  clockMs,
  isActiveClock,
  materialAdvantage,
  align,
}: PlayerCardProps): React.ReactElement {
  const low = isActiveClock && clockMs < 30_000;
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
        <div
          className={cn(
            "flex items-center gap-1 font-mono text-lg tabular-nums",
            low ? "text-royal-danger" : "text-royal-ivory",
          )}
        >
          <Clock className="size-4 text-royal-muted" aria-hidden />
          {formatClock(clockMs)}
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
}
