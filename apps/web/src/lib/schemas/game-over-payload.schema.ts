import { z } from "zod";

const playerInfoSchema = z.object({
  username: z.string(),
  avatarUrl: z.string().nullable(),
  ratingBefore: z.number().optional(),
});

export const gameOverPayloadSchema = z.object({
  result: z.enum(["white", "black", "draw"]).optional(),
  reason: z.string().optional(),
  whiteEloChange: z.number().optional(),
  blackEloChange: z.number().optional(),
  whiteEloAfter: z.number().optional(),
  blackEloAfter: z.number().optional(),
  opponentInfo: z
    .object({
      white: playerInfoSchema,
      black: playerInfoSchema,
    })
    .optional(),
  timeControl: z.enum(["BULLET", "BLITZ", "RAPID", "CLASSICAL", "CORRESPONDENCE"]).optional(),
  initialTime: z.number().optional(),
  increment: z.number().optional(),
});

export type GameOverSocketPayload = z.infer<typeof gameOverPayloadSchema>;
