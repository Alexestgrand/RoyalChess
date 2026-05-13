"use client";

import { Swords, Users } from "lucide-react";
import { useCallback, useEffect, useState, type ReactElement } from "react";

interface OnlineStatsResponse {
  readonly onlinePlayers?: unknown;
  readonly activeGames?: unknown;
}

interface StatPillProps {
  readonly icon: ReactElement;
  readonly value: number | null;
  readonly label: string;
  readonly live?: boolean;
}

function StatPill({ icon, value, label, live = false }: StatPillProps): ReactElement {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]/80 px-3 py-1.5 text-xs text-royal-muted shadow-sm backdrop-blur">
      {live ? (
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
        </span>
      ) : (
        <span aria-hidden className="text-[color:var(--gold)]">
          {icon}
        </span>
      )}
      <span className="font-mono text-sm font-semibold tabular-nums text-royal-ivory">
        {value === null ? "—" : value}
      </span>
      <span className="uppercase tracking-[0.1em]">{label}</span>
    </span>
  );
}

export function LobbyOnlineStats(): ReactElement {
  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null);
  const [activeGames, setActiveGames] = useState<number | null>(null);

  const load = useCallback((): void => {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
    void fetch(`${base}/stats/online`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          return;
        }
        const data = (await r.json()) as OnlineStatsResponse;
        if (typeof data.onlinePlayers === "number") {
          setOnlinePlayers(data.onlinePlayers);
        }
        if (typeof data.activeGames === "number") {
          setActiveGames(data.activeGames);
        }
      })
      .catch(() => {
        setOnlinePlayers(null);
        setActiveGames(null);
      });
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="status"
      aria-label="Statistiques en temps réel du lobby"
    >
      <StatPill icon={<Users className="size-3.5" />} value={onlinePlayers} label="en ligne" live />
      {activeGames !== null ? (
        <StatPill icon={<Swords className="size-3.5" />} value={activeGames} label="parties" />
      ) : null}
    </div>
  );
}
