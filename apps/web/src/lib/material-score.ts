import { Chess } from "chess.js";

const VALUES: Readonly<Record<string, number>> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function materialForSide(fen: string, color: "w" | "b"): number {
  const c = Chess();
  if (!c.load(fen)) {
    return 0;
  }
  const board = c.board();
  let sum = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.color === color) {
        sum += VALUES[cell.type] ?? 0;
      }
    }
  }
  return sum;
}

export function materialDelta(fen: string): number {
  return materialForSide(fen, "w") - materialForSide(fen, "b");
}
