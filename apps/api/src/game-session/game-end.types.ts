import type { TimeControl } from "@prisma/client";
import type { DrawReason, GameResult as SharedGameResult } from "@royalchess/shared";

/**
 * Catalogue des raisons de fin de partie persistées dans `Game.endReason`.
 * Volontairement modélisé comme constantes typées (cf. `.cursorrules`
 * « les magic strings sont INTERDITS »). Stocké en `String?` côté DB
 * pour pouvoir évoluer sans nouvelle migration.
 */
export const EndReason = {
  CHECKMATE: "checkmate",
  RESIGNATION: "resignation",
  TIMEOUT: "timeout",
  STALEMATE: "stalemate",
  DRAW_AGREEMENT: "draw_agreement",
  INSUFFICIENT_MATERIAL: "insufficient_material",
  THREEFOLD_REPETITION: "threefold_repetition",
  FIFTY_MOVES: "fifty_moves",
  ABANDON: "abandon",
} as const;

export type EndReason = (typeof EndReason)[keyof typeof EndReason];

/** Mappe une `DrawReason` (shared) vers un `EndReason` persistable. */
export function mapDrawEndReason(reason: DrawReason | undefined): EndReason {
  switch (reason) {
    case "stalemate":
      return EndReason.STALEMATE;
    case "repetition":
      return EndReason.THREEFOLD_REPETITION;
    case "insufficient":
      return EndReason.INSUFFICIENT_MATERIAL;
    case "fifty-moves":
      return EndReason.FIFTY_MOVES;
    default:
      // Cas edge : `mr.isDraw === true` mais pas de `drawReason` explicite.
      // On retombe sur "accord mutuel" — moins informatif mais valide.
      return EndReason.DRAW_AGREEMENT;
  }
}

/**
 * Informations publiques sur les deux joueurs au moment de la finalisation.
 * `ratingBefore` est le rating AVANT recalcul Glicko-2 (utile pour
 * afficher "1500 → 1512" côté client).
 */
export interface OpponentInfo {
  readonly white: {
    readonly username: string;
    readonly avatarUrl: string | null;
    readonly ratingBefore: number;
  };
  readonly black: {
    readonly username: string;
    readonly avatarUrl: string | null;
    readonly ratingBefore: number;
  };
}

/** Méta retournée par `persistFinishedGame` en cas de finalisation effective. */
export interface FinalizedGameMeta {
  readonly endReason: EndReason;
  readonly whiteEloAfter: number;
  readonly blackEloAfter: number;
  readonly whiteEloChange: number;
  readonly blackEloChange: number;
  readonly opponentInfo: OpponentInfo;
  readonly timeControl: TimeControl;
  readonly initialTime: number;
  readonly increment: number;
}

/** Payload `SocketEvent.GAME_OVER` enrichi (broadcast room). */
export interface GameOverPayload {
  readonly result: SharedGameResult;
  readonly reason: EndReason;
  readonly whiteEloChange: number;
  readonly blackEloChange: number;
  readonly whiteEloAfter: number;
  readonly blackEloAfter: number;
  readonly opponentInfo: OpponentInfo;
  readonly timeControl: TimeControl;
  readonly initialTime: number;
  readonly increment: number;
}

/** Compose le payload `GAME_OVER` à partir du résultat + meta de finalisation. */
export function buildGameOverPayload(
  result: SharedGameResult,
  meta: FinalizedGameMeta,
): GameOverPayload {
  return {
    result,
    reason: meta.endReason,
    whiteEloChange: meta.whiteEloChange,
    blackEloChange: meta.blackEloChange,
    whiteEloAfter: meta.whiteEloAfter,
    blackEloAfter: meta.blackEloAfter,
    opponentInfo: meta.opponentInfo,
    timeControl: meta.timeControl,
    initialTime: meta.initialTime,
    increment: meta.increment,
  };
}
