import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(254),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/, "Pseudo : 3–20 caractères (lettres, chiffres, _ ou -)"),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, "Au moins une majuscule")
    .regex(/[a-z]/, "Au moins une minuscule")
    .regex(/[0-9]/, "Au moins un chiffre"),
});

export type RegisterDto = z.infer<typeof registerSchema>;
