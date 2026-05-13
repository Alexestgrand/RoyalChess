import { userPreferencesPatchSchema } from "@royalchess/shared";
import type { z } from "zod";

export const updateUserPreferencesSchema = userPreferencesPatchSchema;

export type UpdateUserPreferencesDto = z.infer<typeof updateUserPreferencesSchema>;
