import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { GameState } from "@royalchess/shared";
import { ChessBoard } from "@/components/board/chess-board";
import { useGameStore } from "@/stores/game.store";
import { useUiStore } from "@/stores/ui.store";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function baseGameState(over: Partial<GameState> = {}): GameState {
  return {
    gameId: "g1",
    fen: START_FEN,
    pgn: "",
    turn: "w",
    status: "active",
    whitePlayer: { userId: "w1", username: "white", avatarUrl: null },
    blackPlayer: { userId: "b1", username: "black", avatarUrl: null },
    whiteTimeRemaining: 600_000,
    blackTimeRemaining: 600_000,
    lastMove: null,
    moveCount: 0,
    moveHistory: [],
    isCheck: false,
    ...over,
  };
}

async function clickPiece(user: ReturnType<typeof userEvent.setup>, square: string): Promise<void> {
  await user.click(screen.getAllByRole("button", { name: new RegExp(`^Pièce \\S+ ${square}$`) })[0]!);
}

describe("ChessBoard", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.setState({
      gameState: baseGameState(),
      selectedSquare: null,
      legalMoves: [],
      premove: null,
      isMyTurn: true,
      myColor: "w",
      drawOfferedBy: null,
      moveError: null,
      gameOver: null,
      chatMessages: [],
    });
    useGameStore.getState().setGameState(baseGameState(), "w1");
    useUiStore.setState({ soundEnabled: false });
  });

  it("sélectionne une pièce et affiche les cases légales", async () => {
    const user = userEvent.setup();
    render(<ChessBoard gameId="g1" onMove={vi.fn()} />);
    await clickPiece(user, "e2");
    const legal = useGameStore.getState().legalMoves;
    expect(legal.length).toBeGreaterThan(0);
    expect(legal).toContain("e4");
  });
});
