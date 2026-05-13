"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactElement } from "react";

export interface EloChartPoint {
  readonly date: string;
  readonly rating: number;
  readonly opponentUsername: string;
  readonly gameId: string;
}

export interface EloChartProps {
  readonly points: readonly EloChartPoint[];
}

function buildRows(points: readonly EloChartPoint[]): { label: string; date: string; rating: number; opponentUsername: string }[] {
  return points.map((p) => ({
    ...p,
    label: new Date(p.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
  }));
}

export function EloChart({ points }: EloChartProps): ReactElement {
  const data = buildRows(points);

  if (data.length === 0) {
    return (
      <p className="flex h-full min-h-[200px] items-center justify-center text-sm text-royal-muted">
        Pas assez de parties notées en ELO pour ce contrôle de temps.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={{ stroke: "#334155" }} />
        <YAxis domain={["auto", "auto"]} tick={{ fill: "#94a3b8", fontSize: 11 }} width={40} axisLine={{ stroke: "#334155" }} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) {
              return null;
            }
            const p = payload[0]?.payload as {
              date: string;
              rating: number;
              opponentUsername: string;
            };
            return (
              <div className="rounded-md border border-royal-gold/35 bg-[#16161f] px-3 py-2 text-sm text-royal-ivory shadow-lg">
                <p className="text-xs text-royal-muted">{new Date(p.date).toLocaleString("fr-FR")}</p>
                <p className="font-mono font-semibold text-royal-gold">ELO {p.rating}</p>
                <p className="text-xs text-royal-muted">vs {p.opponentUsername}</p>
              </div>
            );
          }}
        />
        <Line type="monotone" dataKey="rating" stroke="#C9A84C" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
