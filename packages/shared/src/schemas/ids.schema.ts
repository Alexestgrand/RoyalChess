import { z } from "zod";

/** Identifiants Prisma (cuid) utilisés pour `Game`, `User`, etc. */
export const cuidSchema = z.string().cuid();

export type Cuid = z.infer<typeof cuidSchema>;
