import { z } from "zod";

const postgresUrl = z
  .string()
  .min(1)
  .refine(
    (s) => s.startsWith("postgres://") || s.startsWith("postgresql://"),
    "DATABASE_URL doit commencer par postgres:// ou postgresql://",
  );

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
    API_PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: postgresUrl,
    REDIS_URL: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES: z.string().default("15m"),
    JWT_REFRESH_EXPIRES: z.string().default("7d"),
    GOOGLE_CLIENT_ID: z.string().optional().default(""),
    GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
    GOOGLE_CALLBACK_URL: z.string().url().optional().default("http://localhost:3001/auth/google/callback"),
    CORS_ORIGIN: z.string().min(1),
    FRONTEND_URL: z.string().url(),
    REFRESH_COOKIE_NAME: z.string().min(1).default("royal_refresh"),
    INTERNAL_AUTH_BRIDGE_SECRET: z.string().min(16).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      if (data.JWT_ACCESS_SECRET.length < 64) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "JWT_ACCESS_SECRET doit faire au moins 64 caractères en production",
          path: ["JWT_ACCESS_SECRET"],
        });
      }
      if (data.JWT_REFRESH_SECRET.length < 64) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "JWT_REFRESH_SECRET doit faire au moins 64 caractères en production",
          path: ["JWT_REFRESH_SECRET"],
        });
      }
    }
    const hasId = data.GOOGLE_CLIENT_ID.length > 0;
    const hasSecret = data.GOOGLE_CLIENT_SECRET.length > 0;
    if (hasId !== hasSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET doivent être tous deux définis ou vides",
      });
    }
  });

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(config: Record<string, unknown>): AppConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Configuration invalide: ${JSON.stringify(msg)}`);
  }
  return parsed.data;
}
