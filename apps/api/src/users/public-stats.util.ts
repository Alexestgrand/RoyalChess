/**
 * Pourcentage de performance type « points tournoi » : victoire = 1,
 * nulle = 0,5, défaite = 0. Le dénominateur exclut les parties terminales
 * hors bucket (ex. abandons non reclassés en victoire/défaite ici).
 */
export function computeWinRatePct(wins: number, losses: number, draws: number): number {
  const denom = wins + losses + draws;
  if (denom <= 0) {
    return 0;
  }
  return Math.round((100 * (wins + 0.5 * draws)) / denom);
}
