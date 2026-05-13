import type { PieceColor, PieceType, Square } from "@royalchess/shared";

const PIECE_TYPE_LABELS: Readonly<Record<PieceType, string>> = {
  p: "Pion",
  n: "Cavalier",
  b: "Fou",
  r: "Tour",
  q: "Dame",
  k: "Roi",
};

/**
 * Libellé vocal court pour une pièce (ex. « Pion blanc »), utilisé par l’ARIA
 * et les annonces `aria-live` du drag-and-drop.
 */
export function formatPieceFrenchLabel(type: PieceType, color: PieceColor): string {
  const kind = PIECE_TYPE_LABELS[type];
  const shade = color === "w" ? "blanc" : "noir";
  return `${kind} ${shade}`;
}

/**
 * Libellé ARIA d’une case de l’échiquier (grille), pièce présente ou case vide.
 */
export function formatSquareAriaLabel(
  square: Square,
  piece: { readonly type: PieceType; readonly color: PieceColor } | null,
): string {
  if (!piece) {
    return `Case ${square}, vide`;
  }
  return `Case ${square}, ${formatPieceFrenchLabel(piece.type, piece.color)}`;
}
