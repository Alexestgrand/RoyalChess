import { Injectable } from "@nestjs/common";
import { Chess } from "chess.js";
import type { Move as ChessMove, Square as JsSquare } from "chess.js";
import type {
  GameMetadata,
  MoveError,
  MoveInput,
  MoveResult,
  ParsedGame,
  SanMove,
  ServerGameState,
  ValidateMoveResult,
} from "@royalchess/shared";

type ChessBoard = InstanceType<typeof Chess>;

function err(code: MoveError["code"], message: string): ValidateMoveResult {
  return { ok: false, error: { code, message } };
}

function mapCaptured(t: string | undefined): MoveResult["capturedPiece"] {
  if (!t) {
    return undefined;
  }
  const lower = t.toLowerCase();
  if (lower === "p" || lower === "n" || lower === "b" || lower === "r" || lower === "q") {
    return lower;
  }
  return undefined;
}

function classifyDraw(game: ChessBoard): MoveResult["drawReason"] {
  if (game.in_stalemate()) {
    return "stalemate";
  }
  if (game.insufficient_material()) {
    return "insufficient";
  }
  if (game.in_threefold_repetition()) {
    return "repetition";
  }
  return "fifty-moves";
}

@Injectable()
export class ChessEngineService {
  createGame(options: { initialTimeMs: number; incrementMs: number }): ServerGameState {
    const board = new Chess();
    return {
      fen: board.fen(),
      pgn: "",
      turn: board.turn(),
      moveCount: 0,
      whiteTimeRemaining: options.initialTimeMs,
      blackTimeRemaining: options.initialTimeMs,
      incrementMs: options.incrementMs,
    };
  }

  /**
   * Valide et applique un coup à partir du FEN **serveur** (Redis uniquement).
   * Ne jamais passer un FEN fourni par le client sans l'avoir d'abord validé côté session.
   */
  validateAndApplyMove(serverFen: string, move: MoveInput): ValidateMoveResult {
    let game: ChessBoard;
    try {
      game = new Chess(serverFen);
    } catch {
      return err("INVALID_FEN", "Position invalide");
    }
    const from = move.from as JsSquare;
    const to = move.to as JsSquare;
    const played = game.move({
      from,
      to,
      promotion: move.promotion,
    });
    if (!played) {
      return err("ILLEGAL_MOVE", "Coup illégal");
    }
    const isCheckmate = game.in_checkmate();
    const isCheck = game.in_check();
    let isDraw = false;
    let drawReason: MoveResult["drawReason"];
    if (isCheckmate) {
      isDraw = false;
    } else if (game.in_draw()) {
      isDraw = true;
      drawReason = classifyDraw(game);
    }
    const value: MoveResult = {
      san: played.san,
      fen: game.fen(),
      isCheck,
      isCheckmate,
      isDraw,
      drawReason,
      capturedPiece: mapCaptured(played.captured),
    };
    return { ok: true, value };
  }

  isCheck(fen: string): boolean {
    try {
      const game = new Chess(fen);
      return game.in_check();
    } catch {
      return false;
    }
  }

  getLegalMoves(serverFen: string, square: string): string[] {
    try {
      const game = new Chess(serverFen);
      const sq = square as JsSquare;
      const moves = game.moves({ square: sq, verbose: true }) as ChessMove[];
      return moves.map((m) => String(m.to));
    } catch {
      return [];
    }
  }

  generatePGN(moves: readonly SanMove[], metadata: GameMetadata): string {
    const game = new Chess();
    game.header("Event", metadata.event ?? "RoyalChess");
    game.header("Site", "?");
    game.header("Date", metadata.date ?? new Date().toISOString().slice(0, 10).replace(/-/g, "."));
    game.header("Round", metadata.round ?? "?");
    game.header("White", metadata.white);
    game.header("Black", metadata.black);
    game.header("Result", metadata.result ?? "*");
    for (const san of moves) {
      const ok = game.move(san);
      if (!ok) {
        throw new Error(`SAN invalide dans l'historique: ${san}`);
      }
    }
    return game.pgn();
  }

  parsePGN(pgn: string): ParsedGame {
    const game = new Chess();
    if (!game.load_pgn(pgn)) {
      throw new Error("PGN illisible");
    }
    const sanMoves = game.history();
    const raw = game.header() as Record<string, string | undefined>;
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string" && v.length > 0) {
        headers[k] = v;
      }
    }
    return { headers, sanMoves, finalFen: game.fen() };
  }
}
