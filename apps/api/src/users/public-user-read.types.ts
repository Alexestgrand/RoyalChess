/** Réponse `GET /users/:username/stats` (profil public). */
export interface PublicUserGameStatsDto {
  readonly totalGames: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  /** 0–100, points tournoi (nulle = 0,5). */
  readonly winRate: number;
}

/** Point d’historique ELO dérivé des parties terminées en base. */
export interface PublicEloHistoryPointDto {
  readonly date: string;
  readonly rating: number;
  readonly opponentUsername: string;
  readonly gameId: string;
}

/** Réponse `GET /users/:username/elo-history`. */
export interface PublicEloHistoryResponseDto {
  readonly points: readonly PublicEloHistoryPointDto[];
}
