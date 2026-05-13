"use client";

import { Crown, Equal, Skull } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatEndReason } from "@/lib/game-end-reason-labels";
import { useGameStore } from "@/stores/game.store";

export interface GameOverModalProps {
  readonly onNewGame: () => void;
  readonly onAnalyze: () => void;
  readonly onRematch?: () => void;
}

type OutcomeLabel = "Victoire" | "Défaite" | "Nulle" | "Fin de partie";

function labelFor(
  result: "white" | "black" | "draw" | undefined,
  myColor: "w" | "b" | null,
): OutcomeLabel {
  if (result === "draw") return "Nulle";
  if (!result || !myColor) return "Fin de partie";
  const won = (result === "white" && myColor === "w") || (result === "black" && myColor === "b");
  return won ? "Victoire" : "Défaite";
}

function eloDeltaClass(delta: number): string {
  if (delta > 0) return "text-emerald-400";
  if (delta < 0) return "text-royal-danger";
  return "text-royal-muted";
}

export function GameOverModal({ onNewGame, onAnalyze, onRematch }: GameOverModalProps): ReactElement {
  const { data: session } = useSession();
  const router = useRouter();
  const gameOver = useGameStore((s) => s.gameOver);
  const gameState = useGameStore((s) => s.gameState);
  const setGameOver = useGameStore((s) => s.setGameOver);

  const myId = session?.user?.id;
  const myColor: "w" | "b" | null =
    gameState && myId
      ? gameState.whitePlayer.userId === myId
        ? "w"
        : gameState.blackPlayer.userId === myId
          ? "b"
          : null
      : null;

  const open = gameOver !== null;

  // Anime le rating absolu final (de newElo - |eloDelta| vers newElo).
  const [displayElo, setDisplayElo] = useState(0);
  const [displayNewElo, setDisplayNewElo] = useState<number | null>(null);

  useEffect(() => {
    if (!gameOver?.eloDelta) {
      setDisplayElo(0);
      setDisplayNewElo(gameOver?.newElo ?? null);
      return;
    }
    const targetDelta = gameOver.eloDelta;
    const targetNew = gameOver.newElo ?? null;
    const startNew = targetNew !== null ? targetNew - targetDelta : null;
    let frame = 0;
    const steps = 18;
    const id = window.setInterval(() => {
      frame++;
      setDisplayElo(Math.round((targetDelta * frame) / steps));
      if (startNew !== null && targetNew !== null) {
        setDisplayNewElo(Math.round(startNew + ((targetNew - startNew) * frame) / steps));
      }
      if (frame >= steps) {
        window.clearInterval(id);
        setDisplayElo(targetDelta);
        if (targetNew !== null) setDisplayNewElo(targetNew);
      }
    }, 30);
    return () => window.clearInterval(id);
  }, [gameOver?.eloDelta, gameOver?.newElo]);

  const title = labelFor(gameOver?.result, myColor);
  const Icon = gameOver?.result === "draw" ? Equal : title === "Victoire" ? Crown : Skull;
  const reasonLabel = formatEndReason(gameOver?.reason);

  const titleWithReason =
    title !== "Nulle" && title !== "Fin de partie"
      ? `${title} par ${reasonLabel}`
      : title;

  const handleRematch = onRematch ?? onNewGame;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setGameOver(null);
        }
      }}
    >
      <DialogContent
        className="border-royal-gold/30 bg-royal-surface-elevated sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          {gameOver?.opponent ? (
            <div className="mb-3 flex items-center justify-center gap-2">
              <UserAvatar
                username={gameOver.opponent.username}
                src={gameOver.opponent.avatarUrl}
                className="size-8 border border-royal-surface-elevated"
              />
              <span className="text-sm text-royal-muted">vs {gameOver.opponent.username}</span>
            </div>
          ) : null}
          <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full border border-royal-gold/40 bg-royal-surface">
            <Icon className="size-8 text-royal-gold motion-safe:animate-pulse" aria-hidden />
          </div>
          <DialogTitle className="text-center font-display text-2xl">{titleWithReason}</DialogTitle>
          <DialogDescription className="text-center text-base text-royal-muted">
            {title === "Nulle" || title === "Fin de partie" ? reasonLabel : reasonLabel}
          </DialogDescription>
        </DialogHeader>

        {typeof gameOver?.eloDelta === "number" ? (
          <div className="text-center font-mono text-lg">
            <span className={eloDeltaClass(gameOver.eloDelta)}>
              ELO {displayElo > 0 ? "+" : ""}
              {displayElo}
            </span>
            {displayNewElo !== null ? (
              <span className="ml-2 text-royal-muted">
                → {displayNewElo}
              </span>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button type="button" variant="royal" className="w-full" onClick={handleRematch}>
            Rejouer
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={onAnalyze}>
            Analyser
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => router.push("/")}>
            Accueil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
