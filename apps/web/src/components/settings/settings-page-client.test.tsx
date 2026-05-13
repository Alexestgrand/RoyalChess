import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsPageClient } from "@/components/settings/settings-page-client";

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: Readonly<{ children: React.ReactNode }>) => <>{children}</>,
  useSession: () => ({
    data: {
      user: { id: "u1", email: "a@test.com", username: "alice", name: "alice", image: null },
      accessToken: "test-token",
      expires: "2099-01-01",
    },
    status: "authenticated",
    update: vi.fn(),
  }),
}));

describe("SettingsPageClient", () => {
  it("affiche l’onglet Jeu après clic", async () => {
    const user = userEvent.setup();
    render(<SettingsPageClient />);
    await user.click(screen.getByRole("tab", { name: "Jeu" }));
    expect(await screen.findByText("Sons de partie")).toBeInTheDocument();
  });
});
