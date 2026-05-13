import type { ChatMessage, GameState, MoveInput, PieceColor, Square } from "@royalchess/shared";
import { create } from "zustand";

export interface GameOverPayload {
  readonly result?: "white" | "black" | "draw";
  readonly reason?: string;
  readonly eloDelta?: number;
}

/** Joueur déconnecté temporairement (événement serveur `opponent_disconnected`). */
export interface OpponentDisconnectedState {
  readonly userId: string;
  readonly forfeitAt: number;
}

/** Flash visuel sur case(s) après refus serveur du coup optimiste. */
export interface RejectedMoveFlashState {
  readonly from: Square;
  readonly to: Square;
  readonly at: number;
}

let rejectFlashTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

function clearRejectFlashTimer(): void {
  if (rejectFlashTimer !== null) {
    globalThis.clearTimeout(rejectFlashTimer);
    rejectFlashTimer = null;
  }
}

interface GameStoreState {
  gameState: GameState | null;
  chatMessages: readonly ChatMessage[];
  selectedSquare: Square | null;
  legalMoves: readonly Square[];
  premove: MoveInput | null;
  isMyTurn: boolean;
  myColor: PieceColor | null;
  drawOfferedBy: PieceColor | null;
  moveError: string | null;
  gameOver: GameOverPayload | null;
  opponentDisconnected: OpponentDisconnectedState | null;
  gameReady: boolean;
  optimisticFen: string | null;
  optimisticLastMove: MoveInput | null;
  rejectedMove: RejectedMoveFlashState | null;
  setGameState: (state: GameState | null, myUserId: string | undefined) => void;
  appendChatMessage: (msg: ChatMessage) => void;
  setSelectedSquare: (sq: Square | null) => void;
  setLegalMoves: (moves: readonly Square[]) => void;
  setPremove: (m: MoveInput | null) => void;
  setMoveError: (msg: string | null) => void;
  setGameOver: (payload: GameOverPayload | null) => void;
  setOpponentDisconnected: (payload: OpponentDisconnectedState | null) => void;
  setGameReady: (b: boolean) => void;
  setOptimistic: (fen: string, move: MoveInput) => void;
  clearOptimistic: () => void;
  flashReject: (move: { readonly from: Square; readonly to: Square }) => void;
  reset: () => void;
}

function deriveTurnFlags(state: GameState | null, myUserId: string | undefined): {
  isMyTurn: boolean;
  myColor: PieceColor | null;
} {
  if (!state || !myUserId) {
    return { isMyTurn: false, myColor: null };
  }
  const myColor: PieceColor = state.whitePlayer.userId === myUserId ? "w" : "b";
  const onTurn = state.turn;
  return { isMyTurn: onTurn === myColor, myColor };
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  chatMessages: [],
  selectedSquare: null,
  legalMoves: [],
  premove: null,
  isMyTurn: false,
  myColor: null,
  drawOfferedBy: null,
  moveError: null,
  gameOver: null,
  opponentDisconnected: null,
  gameReady: false,
  optimisticFen: null,
  optimisticLastMove: null,
  rejectedMove: null,
  setGameState: (gameState, myUserId) => {
    const flags = deriveTurnFlags(gameState, myUserId);
    const drawOfferedBy = gameState?.drawOfferedBy ?? null;
    set({
      gameState,
      ...flags,
      drawOfferedBy,
      optimisticFen: null,
      optimisticLastMove: null,
    });
  },
  appendChatMessage: (msg) => set({ chatMessages: [...get().chatMessages, msg] }),
  setSelectedSquare: (selectedSquare) => set({ selectedSquare }),
  setLegalMoves: (legalMoves) => set({ legalMoves }),
  setPremove: (premove) => set({ premove }),
  setMoveError: (moveError) => set({ moveError }),
  setGameOver: (gameOver) => set({ gameOver }),
  setOpponentDisconnected: (opponentDisconnected) => set({ opponentDisconnected }),
  setGameReady: (gameReady) => set({ gameReady }),
  setOptimistic: (optimisticFen, optimisticLastMove) => set({ optimisticFen, optimisticLastMove }),
  clearOptimistic: () => set({ optimisticFen: null, optimisticLastMove: null }),
  flashReject: (move) => {
    clearRejectFlashTimer();
    set({ rejectedMove: { from: move.from, to: move.to, at: Date.now() } });
    rejectFlashTimer = globalThis.setTimeout(() => {
      rejectFlashTimer = null;
      set({ rejectedMove: null });
    }, 800);
  },
  reset: () => {
    clearRejectFlashTimer();
    set({
      gameState: null,
      chatMessages: [],
      selectedSquare: null,
      legalMoves: [],
      premove: null,
      isMyTurn: false,
      myColor: null,
      drawOfferedBy: null,
      moveError: null,
      gameOver: null,
      opponentDisconnected: null,
      gameReady: false,
      optimisticFen: null,
      optimisticLastMove: null,
      rejectedMove: null,
    });
  },
}));
