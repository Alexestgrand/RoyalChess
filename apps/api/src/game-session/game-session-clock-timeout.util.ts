import type { GameSessionRecord } from "./game-session.types";

/**
 * Détermine si le joueur au trait a épuisé son chrono (même règle que
 * `handleMove` : pas de décrément avant le 1er coup).
 */
export function computeClockTimeoutLoserId(session: GameSessionRecord, nowMs: number): string | null {
  if (session.status !== "active") {
    return null;
  }
  const elapsed =
    session.moveCount === 0 ? 0 : Math.max(0, nowMs - session.lastMoveTimestamp);
  let whiteT = session.whiteTimeRemaining;
  let blackT = session.blackTimeRemaining;
  if (session.currentTurn === "w") {
    whiteT -= elapsed;
    if (whiteT <= 0) {
      return session.whitePlayerId;
    }
    return null;
  }
  blackT -= elapsed;
  if (blackT <= 0) {
    return session.blackPlayerId;
  }
  return null;
}
