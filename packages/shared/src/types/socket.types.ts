import type { Move } from "./game.types";

export interface MovePayload {
  readonly gameId: string;
  readonly move: Move;
}

export interface ChatMessagePayload {
  readonly gameId: string;
  readonly body: string;
}

export interface MatchmakingJoinPayload {
  readonly timeControlKey: string;
  readonly variantKey: string;
}

/** Erreurs d'admission WebSocket `/game` (émission avant `disconnect`). */
export type GameConnectionErrorCode = "GAME_NOT_FOUND" | "NOT_A_PARTICIPANT";

export interface GameConnectionErrorPayload {
  readonly code: GameConnectionErrorCode;
  readonly gameId: string;
}

export interface GameReadyPayload {
  readonly gameId: string;
}

export interface OpponentDisconnectedPayload {
  readonly userId: string;
  /** Horodatage ms après lequel le joueur déconnecté perdra la partie si absent. */
  readonly willForfeitAt: number;
}

export interface OpponentReconnectedPayload {
  readonly userId: string;
}

export type MoveRejectedReason = "ILLEGAL_MOVE";

export interface MoveRejectedPayload {
  readonly reason: MoveRejectedReason;
  readonly attemptedMove: Pick<Move, "from" | "to"> & { readonly promotion?: string };
}
