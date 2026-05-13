import { Chess, type Square as JsSquare } from "chess.js";
import type { MoveInput, PieceColor, Square } from "@royalchess/shared";

/** Coups pseudo-légaux pour une couleur donnée (pré-visualisation pre-move hors tour). */
export function pseudoLegalTargets(fen: string, color: PieceColor, from: Square): Square[] {
  const parts = fen.split(" ");
  if (parts.length < 2) {
    return [];
  }
  parts[1] = color;
  if (parts.length > 3) {
    parts[3] = "-";
  }
  const c = Chess();
  if (!c.load(parts.join(" "))) {
    return [];
  }
  const moves = c.moves({ square: from as JsSquare, verbose: true });
  return moves.map((m) => m.to as Square);
}

export function isLegalNow(fen: string, move: MoveInput): boolean {
  const c = Chess();
  if (!c.load(fen)) {
    return false;
  }
  const m = c.move({
    from: move.from as JsSquare,
    to: move.to as JsSquare,
    promotion: move.promotion,
  });
  return !!m;
}
