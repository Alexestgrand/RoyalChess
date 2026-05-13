import { z } from "zod";
import { MATCHMAKING_QUEUE_PRESETS } from "@royalchess/shared";

const CLASSICAL_PRESET = { timeControl: "CLASSICAL", initialTime: 1800, increment: 30 } as const;

const ALL_PRIVATE = [...MATCHMAKING_QUEUE_PRESETS, CLASSICAL_PRESET];

export const createPrivateGameSchema = z
  .object({
    timeControl: z.enum(["BULLET", "BLITZ", "RAPID", "CLASSICAL"]),
    initialTime: z.number().int().positive(),
    increment: z.number().int().min(0),
    preferredColor: z.enum(["white", "black", "random"]),
  })
  .refine(
    (d) =>
      ALL_PRIVATE.some(
        (p) =>
          p.timeControl === d.timeControl && p.initialTime === d.initialTime && p.increment === d.increment,
      ),
    { message: "preset_invalide" },
  );

export type CreatePrivateGameDto = z.infer<typeof createPrivateGameSchema>;

export const inviteCodeParamSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
  z.string().length(8).regex(/^[A-Z23456789]+$/),
);
