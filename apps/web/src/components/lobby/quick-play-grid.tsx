"use client";

import { MATCHMAKING_QUEUE_PRESETS } from "@royalchess/shared";
import type { MatchmakingQueuePreset } from "@royalchess/shared";
import { Clock, Loader2, X } from "lucide-react";
import { useCallback, useEffect, type ReactElement } from "react";
import { useSearchParams } from "next/navigation";
import { formatMatchmakingWait, useMatchmaking } from "@/hooks/use-matchmaking";
import { cn } from "@/lib/utils";

const QUICK_MODES: readonly {
  readonly label: string;
  readonly subtitle: string;
  readonly preset: MatchmakingQueuePreset;
}[] = [
  { label: "Bullet", subtitle: "1+0", preset: MATCHMAKING_QUEUE_PRESETS[0] },
  { label: "Blitz", subtitle: "3+2", preset: MATCHMAKING_QUEUE_PRESETS[1] },
  { label: "Blitz", subtitle: "5+0", preset: MATCHMAKING_QUEUE_PRESETS[2] },
  { label: "Rapide", subtitle: "10+0", preset: MATCHMAKING_QUEUE_PRESETS[3] },
];

function presetKey(p: MatchmakingQueuePreset): string {
  return `${p.timeControl}-${p.initialTime}-${p.increment}`;
}

function samePreset(a: MatchmakingQueuePreset | null, b: MatchmakingQueuePreset): boolean {
  return a !== null && a.timeControl === b.timeControl && a.initialTime === b.initialTime && a.increment === b.increment;
}

export function QuickPlayGrid(): ReactElement {
  const mm = useMatchmaking();
  const searchParams = useSearchParams();

  // Auto-join quand on arrive depuis le bouton "Rejouer" avec ?auto=1.
  // On recherche le preset correspondant parmi les presets officiels ;
  // si aucun ne correspond exactement, on ne rejoint pas automatiquement
  // (évite de lancer une file invalide côté serveur).
  useEffect(() => {
    if (searchParams.get("auto") !== "1") {
      return;
    }
    const tc = searchParams.get("tc");
    const initial = Number(searchParams.get("initial") ?? "");
    const inc = Number(searchParams.get("inc") ?? "");
    if (!tc || !Number.isFinite(initial) || !Number.isFinite(inc)) {
      return;
    }
    const preset = MATCHMAKING_QUEUE_PRESETS.find(
      (p) => p.timeControl === tc && p.initialTime === initial && p.increment === inc,
    );
    if (!preset) {
      return;
    }
    mm.joinQueue(preset);
    // On ne liste pas `mm` en dépendance pour éviter une boucle infinie ;
    // l'auto-join ne doit se déclencher qu'une seule fois au mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onModeClick = useCallback(
    (preset: MatchmakingQueuePreset): void => {
      if (mm.status === "found") {
        return;
      }
      mm.joinQueue(preset);
    },
    [mm],
  );

  return (
    <div className="space-y-3">
      {mm.errorMessage && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground"
        >
          {mm.errorMessage}
        </p>
      )}

      {mm.status === "found" && mm.opponent && (
        <div className="space-y-2 rounded-md border border-royal-gold/50 bg-royal-surface px-3 py-3 text-sm text-royal-ivory shadow-md">
          <p className="font-medium text-royal-gold">Adversaire trouvé</p>
          <p>
            <span className="text-royal-muted">Pseudo :</span> {mm.opponent.username}
          </p>
          <p>
            <span className="text-royal-muted">ELO :</span> {mm.opponent.elo}
          </p>
          {mm.countdown !== null ? (
            <p className="text-base font-display text-royal-gold">
              La partie commence dans {mm.countdown}…
            </p>
          ) : null}
        </div>
      )}

      {mm.status === "searching" && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-royal-gold/40 bg-royal-surface px-3 py-2 text-sm text-royal-ivory shadow-md">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 shrink-0 animate-spin text-royal-gold" aria-hidden />
            Recherche d&apos;un adversaire… ({formatMatchmakingWait(mm.waitTime)})
          </span>
          <button
            type="button"
            onClick={mm.cancelQueue}
            className="inline-flex items-center gap-1 rounded-md border border-royal-surface-elevated px-2 py-1 text-xs text-royal-muted transition hover:border-royal-gold hover:text-royal-ivory"
            aria-label="Annuler la recherche"
          >
            <X className="size-3.5" aria-hidden />
            Annuler
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
        {QUICK_MODES.map((m) => {
          const active = samePreset(mm.activePreset, m.preset);
          const searchingHere = mm.status === "searching" && active;
          const disabled = mm.status === "found";
          return (
            <button
              key={presetKey(m.preset)}
              type="button"
              disabled={disabled}
              onClick={() => onModeClick(m.preset)}
              className={cn(
                "group flex flex-col items-start gap-2 rounded-xl border bg-royal-surface p-4 text-left shadow-md transition",
                "border-royal-surface-elevated",
                "hover:border-royal-gold/80 hover:shadow-[0_0_0_1px_rgba(212,175,55,0.35)] hover:ring-1 hover:ring-royal-gold/30",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-gold",
                searchingHere && "border-royal-gold ring-2 ring-royal-gold/40 shadow-lg",
                mm.status === "searching" && !active && "opacity-55",
                disabled && "pointer-events-none opacity-40",
              )}
            >
              {searchingHere ? (
                <Loader2 className="size-5 shrink-0 animate-spin text-royal-gold" aria-hidden />
              ) : (
                <Clock className="size-5 text-royal-gold transition group-hover:text-royal-gold" aria-hidden />
              )}
              <span className="font-display text-lg text-royal-ivory">{m.label}</span>
              <span className="text-sm text-royal-muted">{m.subtitle}</span>
              <span className="text-xs text-royal-gold/90">
                {searchingHere ? "Recherche en cours…" : "Lancer"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
