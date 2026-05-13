import { z } from "zod";

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8, "mot_de_passe_trop_court")
      .max(128)
      .regex(/[A-Z]/, "mot_de_passe_sans_majuscule")
      .regex(/[a-z]/, "mot_de_passe_sans_minuscule")
      .regex(/[0-9]/, "mot_de_passe_sans_chiffre"),
  })
  .superRefine((val, ctx) => {
    if (val.currentPassword === val.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "meme_mot_de_passe",
        path: ["newPassword"],
      });
    }
  });

export type UpdatePasswordDto = z.infer<typeof updatePasswordSchema>;
