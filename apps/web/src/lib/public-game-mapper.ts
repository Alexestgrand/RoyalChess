import type { GameState, GameStatus, PieceColor, PlayerInfo } from "@royalchess/shared";

/** Réponse minimale de `GET /games/:gameId` (parties terminées publiques). */
export interface PublicGameDetailDto {
  readonly id: string;
  readonly status: string;
  readonly pgn: string;
  readonly fen: string | null;
  readonly initialTime: number;
  readonly increment: number;
  readonly whitePlayer: { readonly id: string; readonly username: string; readonly avatarUrl: string | null };
  readonly blackPlayer: { readonly id: string; readonly username: string; readonly avatarUrl: string | null };
}

function mapPrismaStatusToGameStatus(status: string): GameStatus {
  if (status === "WAITING") {
    return "waiting";
  }
  if (status === "ACTIVE") {
    return "active";
  }
  if (status === "ABANDONED") {
    return "abandoned";
  }
  return "completed";
}

function playerFrom(dto: PublicGameDetailDto, color: "white" | "black"): PlayerInfo {
  const p = color === "white" ? dto.whitePlayer : dto.blackPlayer;
  return {
    userId: p.id,
    username: p.username,
    avatarUrl: p.avatarUrl,
  };
}

function turnFromFen(fen: string): PieceColor {
  const parts = fen.split(" ");
  const side = parts[1];
  return side === "b" ? "b" : "w";
}

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function mapPublicGameToInitialState(dto: PublicGameDetailDto): GameState {
  const fen = dto.fen && dto.fen.length > 0 ? dto.fen : START_FEN;
  const ms = dto.initialTime * 1000;
  return {
    gameId: dto.id,
    fen,
    pgn: dto.pgn,
    turn: turnFromFen(fen),
    status: mapPrismaStatusToGameStatus(dto.status),
    whitePlayer: playerFrom(dto, "white"),
    blackPlayer: playerFrom(dto, "black"),
    whiteTimeRemaining: ms,
    blackTimeRemaining: ms,
    lastMove: null,
    moveCount: 0,
    moveHistory: [],
    isCheck: false,
  };
}
