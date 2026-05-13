import { z } from "zod";

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  email: z
    .string()
    .trim()
    .max(254)
    .email()
    .transform((e) => e.toLowerCase())
    .optional(),
  avatarUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
