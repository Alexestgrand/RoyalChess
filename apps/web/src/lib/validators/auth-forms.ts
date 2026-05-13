import { getPasswordStrengthTier } from "@/lib/auth/password-strength";
import { z } from "zod";

export const loginFormSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Au moins 8 caractères"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

const usernameField = z
  .string()
  .min(3, "Au moins 3 caractères")
  .max(20, "20 caractères maximum")
  .regex(/^[a-zA-Z0-9_-]+$/, "Lettres, chiffres, tiret (-) ou underscore (_)");

export const registerFormSchema = z
  .object({
    username: usernameField,
    email: z.string().email("Email invalide"),
    password: z
      .string()
      .min(8, "Au moins 8 caractères")
      .max(128)
      .refine((p) => getPasswordStrengthTier(p) !== "weak", {
        message: "Au moins 8 caractères",
      })
      .refine((p) => /[A-Z]/.test(p), { message: "Au moins une majuscule" })
      .refine((p) => /[a-z]/.test(p), { message: "Au moins une minuscule" })
      .refine((p) => /[0-9]/.test(p), { message: "Au moins un chiffre" }),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
