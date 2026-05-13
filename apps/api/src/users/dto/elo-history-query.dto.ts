import { z } from "zod";

export const eloHistoryQuerySchema = z.object({
  timeControl: z.enum(["BULLET", "BLITZ", "RAPID", "CLASSICAL", "CORRESPONDENCE"]),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export type EloHistoryQueryDto = z.infer<typeof eloHistoryQuerySchema>;
