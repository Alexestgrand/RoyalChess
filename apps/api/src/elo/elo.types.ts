export interface EloPlayerSnapshot {
  readonly userId: string;
  readonly rating: number;
  readonly ratingDeviation: number;
  readonly volatility: number;
}

/** Rating avant/après et delta arrondis pour un joueur d'une partie donnée. */
export interface EloPlayerOutcome {
  readonly userId: string;
  readonly before: number;
  readonly after: number;
  readonly delta: number;
}

/** Résultat agrégé d'un calcul ELO pour les deux joueurs (Blancs / Noirs). */
export interface EloMatchOutcome {
  readonly white: EloPlayerOutcome;
  readonly black: EloPlayerOutcome;
}
