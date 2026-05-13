"use client";

import { useCallback, useEffect, useState } from "react";

interface OnlineStatsResponse {
  readonly onlinePlayers?: unknown;
  readonly activeGames?: unknown;
}

export function LobbyOnlineStats(): React.ReactElement {
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
    <p className="text-sm text-royal-muted">
      Joueurs en ligne :{" "}
      <span className="font-medium text-royal-ivory">{onlinePlayers === null ? "—" : onlinePlayers}</span>
      {activeGames !== null ? (
        <>
          {" "}
          · Parties actives : <span className="font-medium text-royal-ivory">{activeGames}</span>
        </>
      ) : null}
    </p>
  );
}
