"use client";

import { Crown, Equal, Skull } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGameStore } from "@/stores/game.store";

export interface GameOverModalProps {
  readonly onNewGame: () => void;
  readonly onAnalyze: () => void;
}

function labelFor(
  result: "white" | "black" | "draw" | undefined,
  myColor: "w" | "b" | null,
): string {
  if (result === "draw") {
    return "Nulle";
  }
  if (!result || !myColor) {
    return "Fin de partie";
  }
  const won = (result === "white" && myColor === "w") || (result === "black" && myColor === "b");
  return won ? "Victoire" : "Défaite";
}

export function GameOverModal({ onNewGame, onAnalyze }: GameOverModalProps): React.ReactElement {
  const { data: session } = useSession();
  const router = useRouter();
  const gameOver = useGameStore((s) => s.gameOver);
  const gameState = useGameStore((s) => s.gameState);
  const setGameOver = useGameStore((s) => s.setGameOver);
  const [displayElo, setDisplayElo] = useState(0);

  const myId = session?.user?.id;
  const myColor =
    gameState && myId ? (gameState.whitePlayer.userId === myId ? "w" : gameState.blackPlayer.userId === myId ? "b" : null) : null;

  const open = gameOver !== null;

  useEffect(() => {
    if (!gameOver?.eloDelta) {
      setDisplayElo(0);
      return;
    }
    const target = gameOver.eloDelta;
    let frame = 0;
    const steps = 18;
    const id = window.setInterval(() => {
      frame++;
      setDisplayElo(Math.round((target * frame) / steps));
      if (frame >= steps) {
        window.clearInterval(id);
        setDisplayElo(target);
      }
    }, 30);
    return () => window.clearInterval(id);
  }, [gameOver?.eloDelta]);

  const title = labelFor(gameOver?.result, myColor);
  const Icon =
    gameOver?.result === "draw" ? Equal : title === "Victoire" ? Crown : Skull;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setGameOver(null);
        }
      }}
    >
      <DialogContent className="border-royal-gold/30 bg-royal-surface-elevated sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full border border-royal-gold/40 bg-royal-surface">
            <Icon className="size-8 text-royal-gold motion-safe:animate-pulse" aria-hidden />
          </div>
          <DialogTitle className="text-center font-display text-2xl">{title}</DialogTitle>
          <DialogDescription className="text-center text-base text-royal-muted">
            {gameOver?.reason ?? "Partie terminée."}
          </DialogDescription>
        </DialogHeader>
        {typeof gameOver?.eloDelta === "number" ? (
          <p className="text-center font-mono text-lg text-royal-gold">
            ELO {displayElo > 0 ? "+" : ""}
            {displayElo}
          </p>
        ) : null}
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button type="button" variant="royal" className="w-full" onClick={onNewGame}>
            Nouvelle partie
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={onAnalyze}>
            Analyser
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => router.back()}>
            Revoir (retour)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
