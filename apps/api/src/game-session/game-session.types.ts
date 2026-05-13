import type { GameStatus, PieceColor } from "@royalchess/shared";

/** État persistant d'une partie active (Redis). */
export interface GameSessionRecord {
  readonly fen: string;
  readonly pgn: string;
  readonly status: GameStatus;
  readonly whitePlayerId: string;
  readonly blackPlayerId: string;
  readonly whiteTimeRemaining: number;
  readonly blackTimeRemaining: number;
  readonly incrementMs: number;
  readonly lastMoveTimestamp: number;
  readonly currentTurn: PieceColor;
  readonly moveCount: number;
  readonly moveHistoryJson: string;
  readonly whiteDrawOffer: boolean;
  readonly blackDrawOffer: boolean;
}
