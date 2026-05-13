import { z } from "zod";

export const timeControlEnumSchema = z.enum(["BULLET", "BLITZ", "RAPID", "CLASSICAL"]);

/** Presets officiels file matchmaking (clé = contrôle affiché au lobby). */
export const MATCHMAKING_QUEUE_PRESETS = [
  { timeControl: "BULLET", initialTime: 60, increment: 0 },
  { timeControl: "BLITZ", initialTime: 180, increment: 2 },
  { timeControl: "BLITZ", initialTime: 300, increment: 0 },
  { timeControl: "RAPID", initialTime: 600, increment: 0 },
] as const;

export type MatchmakingQueuePreset = (typeof MATCHMAKING_QUEUE_PRESETS)[number];

function isAllowedPreset(tc: string, initialTime: number, increment: number): boolean {
  return MATCHMAKING_QUEUE_PRESETS.some(
    (p) => p.timeControl === tc && p.initialTime === initialTime && p.increment === increment,
  );
}

/** File d'attente matchmaking (`join_queue`) : time control + cadence exacte. */
export const joinQueueSchema = z
  .object({
    timeControl: timeControlEnumSchema,
    initialTime: z.number().int().positive(),
    increment: z.number().int().min(0),
  })
  .refine((d) => isAllowedPreset(d.timeControl, d.initialTime, d.increment), {
    message: "preset_invalide",
  });

export type JoinQueueInput = z.infer<typeof joinQueueSchema>;

/** @deprecated Ancien schéma — préférer joinQueueSchema */
export const matchmakingJoinSchema = z.object({
  timeControlKey: z.string().min(1),
  variantKey: z.string().min(1),
});

export type MatchmakingJoinInput = z.infer<typeof matchmakingJoinSchema>;
