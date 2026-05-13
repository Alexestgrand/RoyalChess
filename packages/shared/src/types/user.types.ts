export interface User {
  readonly id: string;
  readonly email: string;
  readonly username: string;
}

export interface Profile {
  readonly userId: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly bio: string | null;
}

export interface EloRating {
  readonly userId: string;
  readonly standard: number;
  readonly bullet: number;
  readonly blitz: number;
  readonly rapid: number;
}
