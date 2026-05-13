import type { Square } from "@royalchess/shared";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

/** Rangées du haut de l'écran vers le bas (h8 en haut pour les blancs). */
export function displayRanks(flipped: boolean): readonly number[] {
  const whiteBottom = [8, 7, 6, 5, 4, 3, 2, 1] as const;
  return flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [...whiteBottom];
}

export function displayFiles(flipped: boolean): readonly (typeof FILES)[number][] {
  return flipped ? [...FILES].reverse() : FILES;
}

export function squareAt(file: (typeof FILES)[number], rank: number): Square {
  return `${file}${rank}` as Square;
}
