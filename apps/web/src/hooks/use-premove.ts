"use client";

import type { MoveInput } from "@royalchess/shared";
import { useEffect, useRef } from "react";
import { isLegalNow } from "@/lib/premove-helpers";
import { useGameStore } from "@/stores/game.store";

export function usePremove(gameId: string | null, sendMove: (m: MoveInput) => void, cancelPremove: () => void): void {
  const premove = useGameStore((s) => s.premove);
  const isMyTurn = useGameStore((s) => s.isMyTurn);
  const fen = useGameStore((s) => s.gameState?.fen);
  const setPremove = useGameStore((s) => s.setPremove);
  const prevMyTurn = useRef(isMyTurn);
  const sendRef = useRef(sendMove);
  const cancelRef = useRef(cancelPremove);
  sendRef.current = sendMove;
  cancelRef.current = cancelPremove;

  useEffect(() => {
    if (!gameId || !fen) {
      prevMyTurn.current = isMyTurn;
      return;
    }
    const wasMyTurn = prevMyTurn.current;
    if (!wasMyTurn && isMyTurn && premove) {
      if (isLegalNow(fen, premove)) {
        sendRef.current(premove);
        setPremove(null);
      } else {
        setPremove(null);
        cancelRef.current();
      }
    }
    prevMyTurn.current = isMyTurn;
  }, [gameId, fen, isMyTurn, premove, setPremove]);
}
