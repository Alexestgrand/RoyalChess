import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/stores/auth.store";

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isLoading: false });
  });

  it("met à jour l'utilisateur et le charge", () => {
    useAuthStore.getState().setUser({
      id: "1",
      email: "a@b.com",
      username: "alice",
      avatarUrl: null,
    });
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().user?.username).toBe("alice");
    expect(useAuthStore.getState().isLoading).toBe(true);
  });

  it("clearUser réinitialise le profil", () => {
    useAuthStore.getState().setUser({
      id: "1",
      email: "a@b.com",
      username: "alice",
      avatarUrl: null,
    });
    useAuthStore.getState().clearUser();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
