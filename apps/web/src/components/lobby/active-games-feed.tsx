"use client";

import { CreateGameDialog } from "@/components/lobby/create-game-dialog";
import type { ReactElement } from "react";

/** Flux parties actives : vide tant que le WebSocket lobby n’est pas branché. */
export function ActiveGamesFeed(): ReactElement {
  return (
    <div className="rounded-xl border border-royal-surface-elevated bg-royal-surface/80 p-6 text-center">
      <p className="font-display text-lg font-medium text-royal-ivory">Soyez le premier à jouer !</p>
      <p className="mt-2 text-sm text-royal-muted">
        Aucune partie en direct pour le moment. Créez une table privée ou lancez une partie rapide.
      </p>
      <div className="mt-5 flex justify-center">
        <CreateGameDialog />
      </div>
    </div>
  );
}
