import type { MatchmakingFoundPayload } from "@royalchess/shared";
import { create } from "zustand";

interface MatchmakingStoreState {
  readonly pendingMatch: MatchmakingFoundPayload | null;
  setPendingMatch: (payload: MatchmakingFoundPayload | null) => void;
}

export const useMatchmakingStore = create<MatchmakingStoreState>((set) => ({
  pendingMatch: null,
  setPendingMatch: (payload) => set({ pendingMatch: payload }),
}));
