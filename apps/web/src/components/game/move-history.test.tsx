import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MoveHistory } from "@/components/game/move-history";

describe("MoveHistory", () => {
  it("affiche la notation PGN par rangées", () => {
    const pgn = "1. e4 e5 2. Nf3 Nc6";
    render(<MoveHistory pgn={pgn} />);
    expect(screen.getByText("e4")).toBeInTheDocument();
    expect(screen.getByText("e5")).toBeInTheDocument();
    expect(screen.getByText("Nf3")).toBeInTheDocument();
    expect(screen.getByText("Nc6")).toBeInTheDocument();
  });
});
