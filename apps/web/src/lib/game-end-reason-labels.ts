/**
 * Mapping des `endReason` serveur vers leur libellé français.
 * Utilisé dans `GameOverModal` et dans la page d'historique de profil.
 */
export const REASON_LABELS_FR: Readonly<Record<string, string>> = {
  checkmate: "Échec et Mat",
  resignation: "Abandon",
  timeout: "Victoire au temps",
  stalemate: "Pat",
  draw_agreement: "Nulle par accord",
  insufficient_material: "Matériel insuffisant",
  threefold_repetition: "Triple répétition",
  fifty_moves: "Règle des 50 coups",
  abandon: "Adversaire absent",
};

export function formatEndReason(reason: string | undefined | null): string {
  if (!reason) {
    return "Partie terminée";
  }
  return REASON_LABELS_FR[reason] ?? reason;
}
