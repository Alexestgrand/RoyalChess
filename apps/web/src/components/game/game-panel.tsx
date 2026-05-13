"use client";

import type { ReactElement } from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { GameChat } from "@/components/game/game-chat";
import { MoveHistory } from "@/components/game/move-history";
import { PlayerCard } from "@/components/game/player-card";
import { materialDelta } from "@/lib/material-score";
import { useUiStore } from "@/stores/ui.store";
import { useGameStore } from "@/stores/game.store";

export interface GamePanelProps {
  readonly gameId: string;
  readonly sendChatMessage: (content: string) => void;
  readonly resign: () => void;
  readonly offerDraw: () => void;
  readonly acceptDraw: () => void;
  readonly declineDraw: () => void;
  readonly compactMovesOnly?: boolean;
  readonly compactChatOnly?: boolean;
  readonly compactInfoOnly?: boolean;
}

export function GamePanel({
  gameId,
  sendChatMessage,
  resign,
  offerDraw,
  acceptDraw,
  declineDraw,
  compactMovesOnly,
  compactChatOnly,
  compactInfoOnly,
}: GamePanelProps): ReactElement {
  void gameId;
  const gameState = useGameStore((s) => s.gameState);
  const drawOfferedBy = useGameStore((s) => s.drawOfferedBy);
  const myColor = useGameStore((s) => s.myColor);
  const gameReady = useGameStore((s) => s.gameReady);
  const soundEnabled = useUiStore((s) => s.soundEnabled);
  const toggleSound = useUiStore((s) => s.toggleSound);

  if (!gameState) {
    return <div className="rounded-xl border border-royal-surface-elevated bg-royal-surface p-4 text-sm text-royal-muted">Chargement…</div>;
  }

  const fen = gameState.fen;
  const delta = materialDelta(fen);
  const whiteAdv = delta > 0 ? delta : 0;
  const blackAdv = delta < 0 ? -delta : 0;

  const movesBlock = (
    <div className="space-y-2">
      <h3 className="font-display text-sm font-semibold text-royal-gold">Historique</h3>
      <MoveHistory pgn={gameState.pgn} />
    </div>
  );

  const chatBlock = (
    <div className="space-y-2">
      <h3 className="font-display text-sm font-semibold text-royal-gold">Chat</h3>
      <GameChat sendChatMessage={sendChatMessage} />
    </div>
  );

  const drawIOffered = drawOfferedBy !== null && myColor !== null && drawOfferedBy === myColor;
  const drawOpponentOffered = drawOfferedBy !== null && myColor !== null && drawOfferedBy !== myColor;
  const gameIsActive = gameState.status === "active";

  const actionsBlock = (
    <div className="flex flex-wrap gap-2">
      {drawOpponentOffered ? (
        <>
          <Button type="button" size="sm" variant="royal" onClick={acceptDraw}>
            Accepter nulle
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={declineDraw}>
            Refuser nulle
          </Button>
        </>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={offerDraw}
          disabled={!gameIsActive || drawIOffered}
          aria-label={drawIOffered ? "Offre de nulle envoyée, en attente de l'adversaire" : "Proposer nulle"}
        >
          {drawIOffered ? "Nulle proposée…" : "Proposer nulle"}
        </Button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" size="sm" variant="destructive" disabled={!gameIsActive}>
            Abandonner
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandonner la partie ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est définitive.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={resign}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button type="button" size="sm" variant="ghost" onClick={toggleSound} aria-label="Activer ou désactiver les sons de la partie">
        {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4 text-royal-muted" />}
      </Button>
    </div>
  );

  const infoBlock = (
    <div className="space-y-3">
      <PlayerCard
        align="top"
        username={gameState.blackPlayer.username}
        avatarUrl={gameState.blackPlayer.avatarUrl}
        clockMs={gameState.blackTimeRemaining}
        isActiveClock={gameState.status === "active" && gameState.turn === "b"}
        materialAdvantage={blackAdv}
        gameReady={gameReady}
        gameStatus={gameState.status}
      />
      <PlayerCard
        align="bottom"
        username={gameState.whitePlayer.username}
        avatarUrl={gameState.whitePlayer.avatarUrl}
        clockMs={gameState.whiteTimeRemaining}
        isActiveClock={gameState.status === "active" && gameState.turn === "w"}
        materialAdvantage={whiteAdv}
        gameReady={gameReady}
        gameStatus={gameState.status}
      />
      {actionsBlock}
    </div>
  );

  if (compactMovesOnly) {
    return <div className="rounded-xl border border-royal-surface-elevated bg-royal-surface p-3">{movesBlock}</div>;
  }
  if (compactChatOnly) {
    return <div className="rounded-xl border border-royal-surface-elevated bg-royal-surface p-3">{chatBlock}</div>;
  }
  if (compactInfoOnly) {
    return <div className="rounded-xl border border-royal-surface-elevated bg-royal-surface p-3">{infoBlock}</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-xl border border-royal-surface-elevated bg-royal-surface p-4 shadow-lg">
      {infoBlock}
      {movesBlock}
      {chatBlock}
    </div>
  );
}
