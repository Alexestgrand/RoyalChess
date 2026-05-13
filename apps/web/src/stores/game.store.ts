import type { ChatMessage, GameState, MoveInput, PieceColor, Square } from "@royalchess/shared";
import { create } from "zustand";

export interface GameOverPayload {
  readonly result?: "white" | "black" | "draw";
  readonly reason?: string;
  readonly eloDelta?: number;
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
  setGameState: (state: GameState | null, myUserId: string | undefined) => void;
  appendChatMessage: (msg: ChatMessage) => void;
  setSelectedSquare: (sq: Square | null) => void;
  setLegalMoves: (moves: readonly Square[]) => void;
  setPremove: (m: MoveInput | null) => void;
  setMoveError: (msg: string | null) => void;
  setGameOver: (payload: GameOverPayload | null) => void;
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
  setGameState: (gameState, myUserId) => {
    const flags = deriveTurnFlags(gameState, myUserId);
    // L'offre de nulle est portée par le `GameState` lui-même : on
    // recopie la valeur dans le store afin que les boutons "Accepter /
    // Refuser nulle" deviennent visibles côté adversaire. Sans cette
    // propagation explicite, `drawOfferedBy` resterait figé sur sa
    // valeur initiale (null).
    const drawOfferedBy = gameState?.drawOfferedBy ?? null;
    set({ gameState, ...flags, drawOfferedBy });
  },
  appendChatMessage: (msg) => set({ chatMessages: [...get().chatMessages, msg] }),
  setSelectedSquare: (selectedSquare) => set({ selectedSquare }),
  setLegalMoves: (legalMoves) => set({ legalMoves }),
  setPremove: (premove) => set({ premove }),
  setMoveError: (moveError) => set({ moveError }),
  setGameOver: (gameOver) => set({ gameOver }),
  reset: () =>
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
    }),
}));
