"use client";

import Link from "next/link";
import { useMemo, type ReactElement } from "react";
import { EloChart } from "@/components/profile/elo-chart";
import { cn } from "@/lib/utils";

const TC_ORDER = ["BULLET", "BLITZ", "RAPID", "CLASSICAL"] as const;
export type ChartTimeControl = (typeof TC_ORDER)[number];

const TC_LABELS: Readonly<Record<ChartTimeControl, string>> = {
  BULLET: "Bullet",
  BLITZ: "Blitz",
  RAPID: "Rapide",
  CLASSICAL: "Classique",
};

export type EloHistoryPoint = {
  readonly date: string;
  readonly rating: number;
  readonly opponentUsername: string;
  readonly gameId: string;
};

export interface ProfileEloPanelProps {
  readonly profileUsername: string;
  readonly historyPage: number;
  readonly chartTc: ChartTimeControl;
  readonly chartPoints: readonly EloHistoryPoint[];
  readonly eloRatings: readonly { timeControl: string; rating: number }[];
  readonly eloHistoryByTc: Readonly<Record<ChartTimeControl, readonly EloHistoryPoint[]>>;
}

function variation30dLabel(points: readonly { date: string; rating: number }[]): string {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const inWindow = points.filter((p) => new Date(p.date).getTime() >= cutoff);
  if (inWindow.length < 2) {
    return "—";
  }
  const first = inWindow[0]!.rating;
  const last = inWindow[inWindow.length - 1]!.rating;
  const d = last - first;
  if (d === 0) {
    return "0";
  }
  return d > 0 ? `+${d}` : `${d}`;
}

function ratingForTc(
  ratings: readonly { timeControl: string; rating: number }[],
  tc: ChartTimeControl,
): number | null {
  const row = ratings.find((x) => x.timeControl === tc);
  return row?.rating ?? null;
}

function chartHref(username: string, tc: ChartTimeControl, page: number): string {
  const u = encodeURIComponent(username);
  const sp = new URLSearchParams();
  sp.set("chartTc", tc);
  if (page > 1) {
    sp.set("page", String(page));
  }
  return `/profile/${u}?${sp.toString()}`;
}

export function ProfileEloPanel({
  profileUsername,
  historyPage,
  chartTc,
  chartPoints,
  eloRatings,
  eloHistoryByTc,
}: ProfileEloPanelProps): ReactElement {
  const memoPoints = useMemo(() => chartPoints, [chartPoints]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {TC_ORDER.map((tc) => {
          const current = ratingForTc(eloRatings, tc);
          const variation = variation30dLabel(eloHistoryByTc[tc] ?? []);
          const varCls =
            variation === "—"
              ? "text-royal-muted"
              : variation.startsWith("+")
                ? "text-emerald-400"
                : variation === "0"
                  ? "text-royal-muted"
                  : "text-red-400";
          return (
            <Link
              key={tc}
              href={chartHref(profileUsername, tc, historyPage)}
              className={cn(
                "block rounded-xl border bg-royal-surface/80 p-4 shadow-sm transition hover:border-royal-gold/50",
                chartTc === tc ? "border-royal-gold/60 ring-1 ring-royal-gold/30" : "border-royal-surface-elevated",
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-royal-muted">{TC_LABELS[tc]}</p>
              <p className="mt-1 font-mono text-2xl text-royal-ivory">{current !== null ? current : "—"}</p>
              <p className="mt-1 text-xs text-royal-muted">
                Variation 30j : <span className={cn("font-mono font-medium", varCls)}>{variation}</span>
              </p>
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border border-royal-surface-elevated bg-royal-surface/80 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {TC_ORDER.map((tc) => (
            <Link
              key={tc}
              href={chartHref(profileUsername, tc, historyPage)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                chartTc === tc
                  ? "border-royal-gold/60 bg-royal-gold/15 text-royal-gold"
                  : "border-royal-surface-elevated text-royal-muted hover:border-royal-gold/40 hover:text-royal-ivory",
              )}
            >
              {TC_LABELS[tc]}
            </Link>
          ))}
        </div>
        <div className="h-[280px] w-full min-h-[200px]">
          <EloChart points={memoPoints} />
        </div>
      </div>
    </div>
  );
}
