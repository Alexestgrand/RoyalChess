import { DEFAULT_USER_PREFERENCES, mergeUserPreferences, userPreferencesPatchSchema } from "@royalchess/shared";
import { describe, expect, it } from "vitest";

describe("UserPreferences Zod", () => {
  it("rejette une valeur de thème invalide", () => {
    const r = userPreferencesPatchSchema.safeParse({ boardTheme: "invalid-theme" });
    expect(r.success).toBe(false);
  });

  it("fusionne un patch partiel sans écraser le reste", () => {
    const merged = mergeUserPreferences(DEFAULT_USER_PREFERENCES, { soundEnabled: false });
    expect(merged.soundEnabled).toBe(false);
    expect(merged.boardTheme).toBe(DEFAULT_USER_PREFERENCES.boardTheme);
  });
});
