import { z } from "zod";

/**
 * Thèmes d’échiquier (attribut `data-board-theme` sur `<html>` côté web).
 * — `royal-classic` : tons sable / acajou par défaut (équivalent historique).
 * — `forest-stone` : cases vert-gris / pierre.
 * — `midnight-blue` : cases bleu nuit / indigo.
 * — `slate-marble` : gris ardoise / marbre froid.
 */
export const boardThemeSchema = z.enum(["royal-classic", "forest-stone", "midnight-blue", "slate-marble"]);

/** Dossiers sous `public/pieces/<dossier>/`. */
export const pieceThemeSchema = z.enum(["classic", "royal", "neo"]);

export const analysisArrowColorSchema = z.enum(["gold", "emerald", "cyan", "violet"]);

export const userPreferencesSchema = z.object({
  soundEnabled: z.boolean(),
  pieceAnimationsEnabled: z.boolean(),
  showLegalMoves: z.boolean(),
  premovesEnabled: z.boolean(),
  analysisArrowColor: analysisArrowColorSchema,
  boardTheme: boardThemeSchema,
  pieceTheme: pieceThemeSchema,
});

/**
 * Valeurs par défaut documentées (nouveau compte ou JSON absent / invalide) :
 * — Sons activés, animations de pièces activées, coups légaux affichés, prémoves activés.
 * — Flèches d’analyse couleur or, thème d’échiquier `royal-classic`, pièces `classic`.
 */
export const DEFAULT_USER_PREFERENCES = {
  soundEnabled: true,
  pieceAnimationsEnabled: true,
  showLegalMoves: true,
  premovesEnabled: true,
  analysisArrowColor: "gold",
  boardTheme: "royal-classic",
  pieceTheme: "classic",
} as const satisfies z.infer<typeof userPreferencesSchema>;

export const userPreferencesPatchSchema = userPreferencesSchema.partial();

export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type UserPreferencesPatch = z.infer<typeof userPreferencesPatchSchema>;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Fusion profonde pour objets JSON plats ou imbriqués (pas de tableaux dans les préférences). */
export function deepMergePreferences(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }
    const existing = out[key];
    if (isPlainObject(value) && isPlainObject(existing)) {
      out[key] = deepMergePreferences(existing, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function parseStoredUserPreferences(raw: unknown): UserPreferences {
  if (raw === null || raw === undefined) {
    return { ...DEFAULT_USER_PREFERENCES };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_USER_PREFERENCES };
  }
  const partial = userPreferencesPatchSchema.safeParse(raw);
  if (!partial.success) {
    return { ...DEFAULT_USER_PREFERENCES };
  }
  return mergeUserPreferences({ ...DEFAULT_USER_PREFERENCES }, partial.data);
}

export function mergeUserPreferences(current: UserPreferences, patch: UserPreferencesPatch): UserPreferences {
  const merged = deepMergePreferences(
    current as unknown as Record<string, unknown>,
    patch as unknown as Record<string, unknown>,
  );
  return userPreferencesSchema.parse(merged);
}
