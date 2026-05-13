import { create } from "zustand";

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly avatarUrl: string | null;
}

interface AuthStoreState {
  readonly user: AuthUser | null;
  readonly isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
  setLoading: (value: boolean) => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  setLoading: (value) => set({ isLoading: value }),
}));
