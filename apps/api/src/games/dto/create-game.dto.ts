import { z } from "zod";

export const createGameSchema = z.object({
  opponentId: z.string().min(1),
});

export type CreateGameDto = z.infer<typeof createGameSchema>;
