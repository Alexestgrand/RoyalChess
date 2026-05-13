import { moveInputSchema } from "@royalchess/shared";
import { z } from "zod";

/** Payload `move_rejected` côté socket (autorité serveur sur la légalité). */
export const moveRejectedPayloadSchema = z.object({
  reason: z.string(),
  attemptedMove: moveInputSchema.optional(),
});

export type MoveRejectedPayload = z.infer<typeof moveRejectedPayloadSchema>;
