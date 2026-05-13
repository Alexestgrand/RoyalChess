export const TIME_CONTROLS = {
  BULLET_1_0: { key: "bullet_1_0", initialMs: 60_000, incrementMs: 0 },
  BLITZ_3_0: { key: "blitz_3_0", initialMs: 180_000, incrementMs: 0 },
  RAPID_10_0: { key: "rapid_10_0", initialMs: 600_000, incrementMs: 0 },
} as const;

export type TimeControlKey = (typeof TIME_CONTROLS)[keyof typeof TIME_CONTROLS]["key"];

export const GAME_VARIANTS = {
  STANDARD: "standard",
  CHESS960: "chess960",
} as const;

export type GameVariantKey = (typeof GAME_VARIANTS)[keyof typeof GAME_VARIANTS];
