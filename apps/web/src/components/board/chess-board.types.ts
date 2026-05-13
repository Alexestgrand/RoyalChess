import type { GameState, MoveInput, PieceColor, Square } from "@royalchess/shared";
import type { RejectedMoveFlashState } from "@/stores/game.store";

export interface ChessBoardProps {
  readonly gameId: string;
  readonly analysisMode?: boolean;
  /** FEN piloté localement (mode analyse / replay). */
  readonly controlledFen?: string | null;
  /** Désactive sélection et coups (affichage seul). */
  readonly interactive?: boolean;
  readonly onMove: (move: MoveInput) => void;
  readonly onCancelPremove?: () => void;
  readonly onQueuePremove?: (move: MoveInput) => void;
}

/** Données jeu souscrites via `useShallow` pour limiter les re-renders du board. */
export interface ChessBoardGameSlice {
  readonly gameFen: string | null;
  readonly gameLastMove: MoveInput | null;
  readonly gameStatus: GameState["status"] | null;
  readonly selectedSquare: Square | null;
  readonly legalMoves: readonly Square[];
  readonly premove: MoveInput | null;
  readonly myColor: PieceColor | null;
  readonly isMyTurn: boolean;
  readonly moveError: string | null;
  readonly optimisticFen: string | null;
  readonly optimisticLastMove: MoveInput | null;
  readonly rejectedMove: RejectedMoveFlashState | null;
  readonly setSelectedSquare: (sq: Square | null) => void;
  readonly setLegalMoves: (moves: readonly Square[]) => void;
}

/** Préférences UI lues par l’échiquier (sons, thème pièces, surbrillances). */
export interface ChessBoardUiSlice {
  readonly soundEnabled: boolean;
  readonly pieceTheme: string;
  readonly showLegalMoves: boolean;
  readonly pieceAnimationsEnabled: boolean;
}

/** Props publiques + slices stabilisés pour `React.memo`. */
export type ChessBoardViewProps = ChessBoardProps & {
  readonly board: ChessBoardGameSlice;
  readonly ui: ChessBoardUiSlice;
};
