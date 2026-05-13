"use client";

/**
 * Bannière persistante affichée sous l'échiquier dès qu'une partie est
 * terminée (`completed` / `abandoned`).
 *
 * Elle vit à côté du modal `GameOverModal` : si l'utilisateur ferme le modal
 * (croix, clic sur l'overlay, Escape), il garde sous les yeux les actions
 * importantes (revoir le résumé, lancer une nouvelle partie, analyser la
 * partie). Sans cette bannière, l'écran de fin de partie ne proposait plus
 * aucune sortie utile une fois le modal fermé.
 */

import { Crown, Equal, RotateCcw, Search, Skull } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game.store";

export interface GameOverBannerProps {
  readonly canReopen: boolean;
  readonly onReopenSummary: () => void;
  readonly onNewGame: () => void;
  readonly onAnalyze: () => void;
}

function resolveOutcome(
  result: "white" | "black" | "draw" | undefined,
  myColor: "w" | "b" | null,
): { readonly label: string; readonly Icon: typeof Crown } {
  if (result === "draw") {
    return { label: "Nulle", Icon: Equal };
  }
  if (!result || !myColor) {
    return { label: "Partie terminée", Icon: Equal };
  }
  const won = (result === "white" && myColor === "w") || (result === "black" && myColor === "b");
  return won ? { label: "Victoire", Icon: Crown } : { label: "Défaite", Icon: Skull };
}

export function GameOverBanner({
  canReopen,
  onReopenSummary,
  onNewGame,
  onAnalyze,
}: GameOverBannerProps): React.ReactElement {
  const { data: session } = useSession();
  const gameState = useGameStore((s) => s.gameState);
  const gameOver = useGameStore((s) => s.gameOver);
  const myColor = useGameStore((s) => s.myColor);

  const myId = session?.user?.id;
  const resolvedColor: "w" | "b" | null =
    myColor ??
    (gameState && myId
      ? gameState.whitePlayer.userId === myId
        ? "w"
        : gameState.blackPlayer.userId === myId
          ? "b"
          : null
      : null);

  const { label, Icon } = resolveOutcome(gameOver?.result, resolvedColor);

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-2 flex w-full flex-col items-stretch gap-3 rounded-xl border border-royal-gold/30 bg-royal-surface px-4 py-3 shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-royal-gold/40 bg-royal-surface-elevated"
        >
          <Icon className="size-5 text-royal-gold" />
        </span>
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold text-royal-ivory">{label}</p>
          {gameOver?.reason ? (
            <p className="text-xs text-royal-muted">{gameOver.reason}</p>
          ) : (
            <p className="text-xs text-royal-muted">Partie terminée.</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {canReopen ? (
          <Button type="button" size="sm" variant="outline" onClick={onReopenSummary}>
            <Search className="mr-1.5 size-4" aria-hidden />
            Revoir le résumé
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="secondary" onClick={onAnalyze}>
          Analyser
        </Button>
        <Button type="button" size="sm" variant="royal" onClick={onNewGame}>
          <RotateCcw className="mr-1.5 size-4" aria-hidden />
          Nouvelle partie
        </Button>
      </div>
    </div>
  );
}
