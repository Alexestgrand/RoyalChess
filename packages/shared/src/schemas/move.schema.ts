import { z } from "zod";

const squareRegex = /^[a-h][1-8]$/;

const squareSchema = z
  .string()
  .length(2)
  .regex(squareRegex, "Case invalide (attendu a1–h8)");

export const moveInputSchema = z.object({
  from: squareSchema,
  to: squareSchema,
  promotion: z.enum(["q", "r", "b", "n"]).optional(),
});

/** Schéma unique de validation des coups (WebSocket / API). */
export const moveSchema = moveInputSchema;

export type MoveInput = z.infer<typeof moveInputSchema>;
