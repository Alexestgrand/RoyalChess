import { ChessEngineService } from "./chess-engine.service";

describe("ChessEngineService", () => {
  const engine = new ChessEngineService();

  describe("validateAndApplyMove", () => {
    it("accepte un coup légal", () => {
      const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const r = engine.validateAndApplyMove(start, { from: "e2", to: "e4" });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.san).toBe("e4");
        expect(r.value.isCheckmate).toBe(false);
        expect(r.value.isDraw).toBe(false);
      }
    });

    it("refuse un coup illégal", () => {
      const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const r = engine.validateAndApplyMove(start, { from: "e2", to: "e5" });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.code).toBe("ILLEGAL_MOVE");
      }
    });

    it("gère la promotion en dame", () => {
      const fen = "8/P4k2/8/8/8/8/4K3/8 w - - 0 1";
      const r = engine.validateAndApplyMove(fen, { from: "a7", to: "a8", promotion: "q" });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.san).toMatch(/^a8=Q/);
      }
    });

    it("gère le petit roque", () => {
      const fen = "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1";
      const r = engine.validateAndApplyMove(fen, { from: "e1", to: "g1" });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.san).toBe("O-O");
      }
    });

    it("gère la prise en passant", () => {
      const fen = "rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 1";
      const r = engine.validateAndApplyMove(fen, { from: "e5", to: "f6" });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.san).toContain("f6");
        expect(r.value.capturedPiece).toBe("p");
      }
    });

    it("détecte le mat", () => {
      const mateInOne = "7k/8/6K1/8/8/8/8/7Q w - - 0 1";
      const r = engine.validateAndApplyMove(mateInOne, { from: "h1", to: "h7" });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.isCheckmate).toBe(true);
        expect(r.value.isDraw).toBe(false);
      }
    });

    it("détecte le pat", () => {
      const beforeStalemate = "k1K5/8/1Q6/8/8/8/8/8 w - - 0 1";
      const r = engine.validateAndApplyMove(beforeStalemate, { from: "b6", to: "c7" });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.isCheckmate).toBe(false);
        expect(r.value.isDraw).toBe(true);
        expect(r.value.drawReason).toBe("stalemate");
      }
    });
  });
});
