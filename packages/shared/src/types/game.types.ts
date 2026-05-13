import type { MoveInput } from "../schemas/move.schema";

/** Colonne échiquier (notation algébrique). */
export type BoardFile = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";

/** Rangée échiquier. */
export type BoardRank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

/** Une case valide (64 combinaisons). */
export type Square = `${BoardFile}${BoardRank}`;

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

/** Couleur côté FEN / tour (`w` = blancs, `b` = noirs). */
export type PieceColor = "w" | "b";

export type Piece = { readonly type: PieceType; readonly color: PieceColor };

export type DrawReason = "stalemate" | "repetition" | "insufficient" | "fifty-moves";

export interface MoveResult {
  readonly san: string;
  readonly fen: string;
  readonly isCheck: boolean;
  readonly isCheckmate: boolean;
  readonly isDraw: boolean;
  readonly drawReason?: DrawReason;
  readonly capturedPiece?: PieceType;
}

export type GameStatus = "waiting" | "active" | "completed" | "abandoned";

export type GameResult = "white" | "black" | "draw";

export interface PlayerInfo {
  readonly userId: string;
  readonly username: string;
  readonly avatarUrl: string | null;
}

export interface GameState {
  readonly gameId: string;
  readonly fen: string;
  readonly pgn: string;
  readonly turn: PieceColor;
  readonly status: GameStatus;
  readonly whitePlayer: PlayerInfo;
  readonly blackPlayer: PlayerInfo;
  readonly whiteTimeRemaining: number;
  readonly blackTimeRemaining: number;
  readonly lastMove: MoveInput | null;
  readonly moveCount: number;
  /**
   * Couleur du joueur qui a actuellement une offre de nulle en attente.
   * `null` quand aucune offre n'est en cours. Optionnel pour rétro-compat
   * avec les payloads sérialisés avant l'ajout du champ.
   */
  readonly drawOfferedBy?: PieceColor | null;
  /**
   * Historique SAN côté serveur (Redis `moveHistoryJson`), aligné sur la
   * position courante.
   */
  readonly moveHistory: readonly string[];
  /** Le camp au trait (`turn`) est-il en échec au FEN courant. */
  readonly isCheck: boolean;
}

/** Alias historique pour les payloads socket (identique à MoveInput). */
export type Move = MoveInput;

export type SanMove = string;

export interface GameMetadata {
  readonly white: string;
  readonly black: string;
  readonly date?: string;
  readonly event?: string;
  readonly round?: string;
  readonly result?: string;
}

export interface ParsedGame {
  readonly headers: Record<string, string>;
  readonly sanMoves: readonly string[];
  readonly finalFen: string;
}

export interface ServerGameState {
  readonly fen: string;
  readonly pgn: string;
  readonly turn: PieceColor;
  readonly moveCount: number;
  readonly whiteTimeRemaining: number;
  readonly blackTimeRemaining: number;
  readonly incrementMs: number;
}

export type MoveErrorCode =
  | "INVALID_FEN"
  | "ILLEGAL_MOVE"
  | "INVALID_SQUARE"
  | "INVALID_PROMOTION";

export interface MoveError {
  readonly code: MoveErrorCode;
  readonly message: string;
}

export type ValidateMoveResult =
  | { readonly ok: true; readonly value: MoveResult }
  | { readonly ok: false; readonly error: MoveError };

/** Couleur côté lobby / UI (distinct du FEN). */
export type LobbyPieceColor = "white" | "black";

export interface GamePlayerRef {
  readonly userId: string;
  readonly color: LobbyPieceColor;
}

/** Message de chat en partie (temps réel). */
export interface ChatMessage {
  readonly authorId: string;
  readonly authorUsername: string;
  readonly content: string;
  readonly sentAt: number;
}

/** État léger pour synchronisation temps réel (ancien contrat). */
export interface LiveGameSnapshot {
  readonly id: string;
  readonly fen: string;
  readonly turn: LobbyPieceColor;
  readonly status: GameStatus;
  readonly players: readonly [GamePlayerRef, GamePlayerRef];
}
