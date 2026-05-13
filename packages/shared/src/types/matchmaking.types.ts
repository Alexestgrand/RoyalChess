/** Adversaire annoncé au match trouvé (WebSocket). */
export interface MatchmakingOpponentDto {
  readonly id: string;
  readonly username: string;
  readonly avatarUrl: string | null;
  readonly elo: number;
}

/** Payload `matchmaking_found` (contrat front / API). */
export interface MatchmakingFoundPayload {
  readonly gameId: string;
  readonly myColor: "white" | "black";
  readonly opponent: MatchmakingOpponentDto;
  readonly timeControl: string;
  readonly initialTime: number;
  readonly increment: number;
}
