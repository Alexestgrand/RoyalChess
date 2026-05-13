export interface EloPlayerSnapshot {
  readonly userId: string;
  readonly rating: number;
  readonly ratingDeviation: number;
  readonly volatility: number;
}
