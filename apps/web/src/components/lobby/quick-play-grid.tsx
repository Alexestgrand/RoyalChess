"use client";

import { MATCHMAKING_QUEUE_PRESETS } from "@royalchess/shared";
import type { MatchmakingQueuePreset } from "@royalchess/shared";
import { Flame, Hourglass, Loader2, LucideIcon, Swords, X, Zap } from "lucide-react";
import { useCallback, useEffect, type ReactElement } from "react";
import { useSearchParams } from "next/navigation";
import { formatMatchmakingWait, useMatchmaking } from "@/hooks/use-matchmaking";
import { cn } from "@/lib/utils";

const QUICK_MODES: readonly {
  readonly label: string;
  readonly subtitle: string;
  readonly tagline: string;
  readonly icon: LucideIcon;
  readonly preset: MatchmakingQueuePreset;
}[] = [
  { label: "Bullet", subtitle: "1+0", tagline: "Réflexes purs", icon: Zap, preset: MATCHMAKING_QUEUE_PRESETS[0] },
  { label: "Blitz", subtitle: "3+2", tagline: "Tempo soutenu", icon: Flame, preset: MATCHMAKING_QUEUE_PRESETS[1] },
  { label: "Blitz", subtitle: "5+0", tagline: "Combat franc", icon: Swords, preset: MATCHMAKING_QUEUE_PRESETS[2] },
  { label: "Rapide", subtitle: "10+0", tagline: "Calcul posé", icon: Hourglass, preset: MATCHMAKING_QUEUE_PRESETS[3] },
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
          const Icon = m.icon;
          return (
            <button
              key={presetKey(m.preset)}
              type="button"
              disabled={disabled}
              onClick={() => onModeClick(m.preset)}
              className={cn(
                // Carte premium : layer surface + bordure ultra-subtile.
                // Hover : remontée 1px, bordure dorée, halo gold doux. Animation 200ms ease-out-expo.
                "group relative isolate flex flex-col items-start gap-3 overflow-hidden rounded-2xl border p-5 text-left",
                "border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]",
                "shadow-[var(--shadow-card)]",
                "transition-[transform,border-color,box-shadow] duration-200 ease-out",
                "hover:-translate-y-0.5 hover:border-[color:var(--border-gold)] hover:shadow-[var(--shadow-elevated),var(--glow-gold)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-base)]",
                searchingHere &&
                  "-translate-y-0.5 border-[color:var(--border-gold-bright)] shadow-[var(--shadow-elevated),var(--glow-gold)]",
                mm.status === "searching" && !active && "opacity-55",
                disabled && "pointer-events-none opacity-40",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  // Glow gold radial discret en haut à droite, révélé au hover ou en recherche.
                  "pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-[color:var(--gold-glow-strong)] blur-2xl",
                  "opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                  searchingHere && "opacity-100",
                )}
              />
              <span
                className={cn(
                  "relative flex size-11 items-center justify-center rounded-xl border transition-colors duration-200",
                  "border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)]",
                  "group-hover:border-[color:var(--border-gold)]",
                  searchingHere && "border-[color:var(--border-gold-bright)]",
                )}
              >
                {searchingHere ? (
                  <Loader2 className="size-5 animate-spin text-[color:var(--gold-bright)]" aria-hidden />
                ) : (
                  <Icon
                    className={cn(
                      "size-5 text-[color:var(--gold)] transition-colors duration-200",
                      "group-hover:text-[color:var(--gold-bright)]",
                    )}
                    aria-hidden
                  />
                )}
              </span>
              <div className="relative flex flex-col">
                <span className="font-display text-xl font-semibold leading-none text-royal-ivory">
                  {m.label}
                </span>
                <span className="mt-1 font-mono text-sm text-royal-muted">{m.subtitle}</span>
              </div>
              <div className="relative mt-1 flex w-full items-center justify-between">
                <span className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                  {m.tagline}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--gold)] transition-transform duration-200",
                    "group-hover:translate-x-0.5 group-hover:text-[color:var(--gold-bright)]",
                  )}
                >
                  {searchingHere ? "Recherche…" : "Lancer →"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
