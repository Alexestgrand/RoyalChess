import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from "@royalchess/shared";
import { createJSONStorage, persist } from "zustand/middleware";
import { create } from "zustand";
import { patchUserPreferences } from "@/lib/patch-user-preferences";

const PERSIST_KEY = "royalchess-settings";
const DEBOUNCE_MS = 400;

let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleServerSync(): void {
  const token = useUiStore.getState().syncAccessToken;
  if (!token) {
    return;
  }
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
  }
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const prefs = useUiStore.getState().toPreferencesPayload();
    void patchUserPreferences(token, prefs).catch(() => undefined);
  }, DEBOUNCE_MS);
}

export interface UiStoreState extends UserPreferences {
  readonly preferencesRehydrated: boolean;
  /** Jeton Bearer pour synchroniser les préférences (non persisté). */
  readonly syncAccessToken: string | undefined;
  setSyncAccessToken: (token: string | undefined) => void;
  markPreferencesRehydrated: () => void;
  /** Fusionne les clés renvoyées par le serveur (`GET /auth/me`) ; ignore si `null`. */
  mergeFromServer: (prefs: UserPreferences | null) => void;
  toPreferencesPayload: () => UserPreferences;
  setSoundEnabled: (v: boolean) => void;
  setPieceAnimationsEnabled: (v: boolean) => void;
  setShowLegalMoves: (v: boolean) => void;
  setPremovesEnabled: (v: boolean) => void;
  setAnalysisArrowColor: (v: UserPreferences["analysisArrowColor"]) => void;
  setBoardTheme: (v: UserPreferences["boardTheme"]) => void;
  setPieceTheme: (v: UserPreferences["pieceTheme"]) => void;
  toggleSound: () => void;
}

function slicePreferences(s: UiStoreState): UserPreferences {
  return {
    soundEnabled: s.soundEnabled,
    pieceAnimationsEnabled: s.pieceAnimationsEnabled,
    showLegalMoves: s.showLegalMoves,
    premovesEnabled: s.premovesEnabled,
    analysisArrowColor: s.analysisArrowColor,
    boardTheme: s.boardTheme,
    pieceTheme: s.pieceTheme,
  };
}

export const useUiStore = create<UiStoreState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_USER_PREFERENCES,
      preferencesRehydrated: false,
      syncAccessToken: undefined,

      markPreferencesRehydrated: (): void => {
        set({ preferencesRehydrated: true });
      },

      toPreferencesPayload: (): UserPreferences => slicePreferences(get()),

      setSyncAccessToken: (token): void => {
        set({ syncAccessToken: token });
      },

      mergeFromServer: (prefs): void => {
        if (prefs === null) {
          return;
        }
        set({ ...prefs });
      },

      setSoundEnabled: (v): void => {
        set({ soundEnabled: v });
        scheduleServerSync();
      },
      setPieceAnimationsEnabled: (v): void => {
        set({ pieceAnimationsEnabled: v });
        scheduleServerSync();
      },
      setShowLegalMoves: (v): void => {
        set({ showLegalMoves: v });
        scheduleServerSync();
      },
      setPremovesEnabled: (v): void => {
        set({ premovesEnabled: v });
        scheduleServerSync();
      },
      setAnalysisArrowColor: (v): void => {
        set({ analysisArrowColor: v });
        scheduleServerSync();
      },
      setBoardTheme: (v): void => {
        set({ boardTheme: v });
        scheduleServerSync();
      },
      setPieceTheme: (v): void => {
        set({ pieceTheme: v });
        scheduleServerSync();
      },

      toggleSound: (): void => {
        set({ soundEnabled: !get().soundEnabled });
        scheduleServerSync();
      },
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): UserPreferences => ({
        soundEnabled: s.soundEnabled,
        pieceAnimationsEnabled: s.pieceAnimationsEnabled,
        showLegalMoves: s.showLegalMoves,
        premovesEnabled: s.premovesEnabled,
        analysisArrowColor: s.analysisArrowColor,
        boardTheme: s.boardTheme,
        pieceTheme: s.pieceTheme,
      }),
      skipHydration: true,
    },
  ),
);
