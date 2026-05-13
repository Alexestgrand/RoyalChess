"use client";

import type { ParsedGame } from "@royalchess/shared";
import { useEffect, useState } from "react";
import { AnalysisGameClient } from "@/components/analysis/analysis-game-client";
import { apiFetch } from "@/lib/api-client";

export function AnalysisPageClient({ gameId }: Readonly<{ gameId: string }>): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ParsedGame | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<ParsedGame>(`/games/${gameId}/analysis`)
      .then((d) => {
        if (!cancelled) {
          setData(d);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  if (loading) {
    return <p className="text-sm text-royal-muted">Chargement de la partie…</p>;
  }
  if (data === null) {
    return (
      <p className="text-sm text-royal-danger">
        Impossible de charger l&apos;analyse (partie non terminée ou indisponible publiquement).
      </p>
    );
  }
  return <AnalysisGameClient data={data} gameId={gameId} />;
}
