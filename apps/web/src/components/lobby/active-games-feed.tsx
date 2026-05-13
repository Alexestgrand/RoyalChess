"use client";

import { Crown } from "lucide-react";
import type { ReactElement } from "react";
import { CreateGameDialog } from "@/components/lobby/create-game-dialog";

/** Flux parties actives : vide tant que le WebSocket lobby n'est pas branché. */
export function ActiveGamesFeed(): ReactElement {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="relative inline-flex items-center justify-center" aria-hidden>
        <span className="absolute inline-flex size-14 animate-ping rounded-full bg-[color:var(--gold-glow-strong)] opacity-50 motion-reduce:hidden" />
        <span className="relative flex size-14 items-center justify-center rounded-full border border-[color:var(--border-gold)] bg-[color:var(--bg-elevated)] shadow-[var(--glow-gold)]">
          <Crown className="size-6 text-[color:var(--gold-bright)]" />
        </span>
      </span>
      <div>
        <p className="font-display text-lg font-semibold text-royal-ivory">
          Le trône est vacant
        </p>
        <p className="mt-1.5 text-sm text-royal-muted">
          Aucune partie en direct. Soyez le premier à entrer dans l&apos;arène.
        </p>
      </div>
      <CreateGameDialog />
    </div>
  );
}
