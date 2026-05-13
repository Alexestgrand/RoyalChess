import { create } from "zustand";

interface UiStoreState {
  readonly soundEnabled: boolean;
  toggleSound: () => void;
}

export const useUiStore = create<UiStoreState>((set, get) => ({
  soundEnabled: true,
  toggleSound: () => set({ soundEnabled: !get().soundEnabled }),
}));
