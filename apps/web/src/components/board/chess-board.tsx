"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Chess, FLAGS, type ChessInstance, type Move, type Square as JsSquare } from "chess.js";
import type { MoveInput, PieceColor, PieceType, Square } from "@royalchess/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChessPiece } from "@/components/board/chess-piece";
import { ChessSquare } from "@/components/board/chess-square";
import { PromotionModal } from "@/components/board/promotion-modal";
import { displayFiles, displayRanks, squareAt } from "@/lib/board-display";
import { pseudoLegalTargets } from "@/lib/premove-helpers";
import { playChessSound } from "@/lib/chess-sounds";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";
import { useGameStore } from "@/stores/game.store";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function buildChess(fen: string): ChessInstance {
  const c = Chess();
  if (!c.load(fen)) {
    c.reset();
  }
  return c;
}

function findKingSquare(c: ChessInstance, color: PieceColor): Square | null {
  const board = c.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r]?.[f];
      if (p && p.type === "k" && p.color === color) {
        const file = String.fromCharCode(97 + f) as Square["0"];
        const rank = (8 - r) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
        return `${file}${rank}` as Square;
      }
    }
  }
  return null;
}

function classifySound(last: Move): "capture" | "castle" | "move" {
  if (last.flags.includes(FLAGS.KSIDE_CASTLE) || last.flags.includes(FLAGS.QSIDE_CASTLE)) {
    return "castle";
  }
  if (last.captured) {
    return "capture";
  }
  return "move";
}

export interface ChessBoardProps {
  readonly gameId: string;
  readonly analysisMode?: boolean;
  /** FEN piloté localement (mode analyse / replay). */
  readonly controlledFen?: string | null;
  /** Désactive sélection et coups (affichage seul). */
  readonly interactive?: boolean;
  readonly onMove: (move: MoveInput) => void;
  readonly onCancelPremove?: () => void;
  readonly onQueuePremove?: (move: MoveInput) => void;
}

export function ChessBoard({
  gameId,
  analysisMode = false,
  controlledFen = null,
  interactive = true,
  onMove,
  onCancelPremove,
  onQueuePremove,
}: ChessBoardProps): React.ReactElement {
  void gameId;
  const gameState = useGameStore((s) => s.gameState);
  const selectedSquare = useGameStore((s) => s.selectedSquare);
  const legalMoves = useGameStore((s) => s.legalMoves);
  const setSelectedSquare = useGameStore((s) => s.setSelectedSquare);
  const setLegalMoves = useGameStore((s) => s.setLegalMoves);
  const premove = useGameStore((s) => s.premove);
  const myColor = useGameStore((s) => s.myColor);
  const isMyTurn = useGameStore((s) => s.isMyTurn);
  const moveError = useGameStore((s) => s.moveError);
  const soundEnabled = useUiStore((s) => s.soundEnabled);

  const [manualFlip, setManualFlip] = useState(false);
  const [promotion, setPromotion] = useState<{
    from: Square;
    to: Square;
    color: PieceColor;
    mode: "play" | "premove";
  } | null>(null);
  const [dragPiece, setDragPiece] = useState<{ square: Square; type: PieceType; color: PieceColor } | null>(null);
  const prevFenRef = useRef<string | null>(null);

  const fen = (controlledFen && controlledFen.length > 0 ? controlledFen : null) ?? gameState?.fen ?? START_FEN;
  const chess = useMemo(() => buildChess(fen), [fen]);

  const viewFlipped = analysisMode ? manualFlip : myColor === "b";

  const ranks = displayRanks(viewFlipped);
  const files = displayFiles(viewFlipped);

  const lastMove = gameState?.lastMove;

  useEffect(() => {
    if (!gameState?.lastMove) {
      prevFenRef.current = fen;
      return;
    }
    const prev = prevFenRef.current;
    if (prev === null || prev === fen) {
      prevFenRef.current = fen;
      return;
    }
    const probe = buildChess(prev);
    const m = probe.move({
      from: gameState.lastMove.from as JsSquare,
      to: gameState.lastMove.to as JsSquare,
      promotion: gameState.lastMove.promotion,
    });
    if (m) {
      if (probe.in_check()) {
        void playChessSound("check", soundEnabled);
      } else {
        void playChessSound(classifySound(m), soundEnabled);
      }
    }
    prevFenRef.current = fen;
  }, [fen, gameState?.lastMove, gameState, soundEnabled]);

  useEffect(() => {
    if (gameState?.status === "completed" || gameState?.status === "abandoned") {
      void playChessSound("gameEnd", soundEnabled);
    }
  }, [gameState?.status, soundEnabled]);

  const inCheck = chess.in_check();
  const turn = chess.turn();

  const clearSelection = useCallback((): void => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [setLegalMoves, setSelectedSquare]);

  const trySelect = useCallback(
    (sq: Square): void => {
      if (!interactive) {
        return;
      }
      const piece = chess.get(sq as JsSquare);
      if (!piece) {
        clearSelection();
        return;
      }
      if (!analysisMode && onQueuePremove && !isMyTurn && myColor && piece.color === myColor) {
        if (selectedSquare === sq) {
          clearSelection();
          return;
        }
        setSelectedSquare(sq);
        setLegalMoves(pseudoLegalTargets(fen, myColor, sq));
        return;
      }
      if (!analysisMode && piece.color !== myColor) {
        return;
      }
      if (!analysisMode && !isMyTurn) {
        return;
      }
      if (selectedSquare === sq) {
        clearSelection();
        return;
      }
      setSelectedSquare(sq);
      const ms = chess.moves({ square: sq as JsSquare, verbose: true }) as Move[];
      setLegalMoves(ms.map((m) => m.to as Square));
    },
    [
      analysisMode,
      chess,
      clearSelection,
      fen,
      isMyTurn,
      myColor,
      onQueuePremove,
      selectedSquare,
      setLegalMoves,
      setSelectedSquare,
      interactive,
    ],
  );

  const submitMove = useCallback(
    (from: Square, to: Square, promotionPick?: MoveInput["promotion"], mode: "play" | "premove" = "play"): void => {
      if (mode === "premove" && onQueuePremove && myColor) {
        const piece = chess.get(from as JsSquare);
        if (!piece) {
          return;
        }
        const toRank = Number(to[1]);
        const needsPromo =
          piece.type === "p" && ((piece.color === "w" && toRank === 8) || (piece.color === "b" && toRank === 1));
        if (needsPromo && !promotionPick) {
          setPromotion({ from, to, color: piece.color as PieceColor, mode: "premove" });
          return;
        }
        onQueuePremove({ from, to, promotion: promotionPick });
        clearSelection();
        return;
      }

      const probe = buildChess(fen);
      const moves = probe.moves({ square: from as JsSquare, verbose: true }) as Move[];
      const match = moves.find((m) => m.to === to && (!promotionPick || m.promotion === promotionPick));
      if (!match) {
        return;
      }
      const moving = chess.get(from as JsSquare);
      if (match.promotion && !promotionPick) {
        if (moving) {
          setPromotion({ from, to, color: moving.color as PieceColor, mode: "play" });
        }
        return;
      }
      onMove({ from, to, promotion: promotionPick ?? match.promotion });
      clearSelection();
    },
    [fen, onMove, onQueuePremove, chess, clearSelection, myColor],
  );

  const handleSquareClick = useCallback(
    (sq: Square): void => {
      if (!interactive) {
        return;
      }
      if (promotion) {
        return;
      }
      if (!selectedSquare) {
        trySelect(sq);
        return;
      }
      if (selectedSquare === sq) {
        clearSelection();
        return;
      }
      if (legalMoves.includes(sq)) {
        const premoveMode = !!(onQueuePremove && !isMyTurn && myColor);
        submitMove(selectedSquare, sq, undefined, premoveMode ? "premove" : "play");
        return;
      }
      trySelect(sq);
    },
    [clearSelection, interactive, legalMoves, onQueuePremove, isMyTurn, myColor, promotion, selectedSquare, submitMove, trySelect],
  );

  const onDragEnd = useCallback(
    (e: DragEndEvent): void => {
      if (!interactive) {
        return;
      }
      setDragPiece(null);
      const active = e.active.data.current as { square: Square } | undefined;
      const overId = e.over?.id;
      if (!active || typeof overId !== "string" || !overId.startsWith("sq-")) {
        return;
      }
      const to = overId.replace("sq-", "") as Square;
      const premoveMode = !!(onQueuePremove && !isMyTurn && myColor);
      submitMove(active.square, to, undefined, premoveMode ? "premove" : "play");
    },
    [interactive, isMyTurn, myColor, onQueuePremove, submitMove],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const boardGrid = chess.board();

  const squarePiece = (sq: Square): { type: PieceType; color: PieceColor } | null => {
    const f = sq.charCodeAt(0) - 97;
    const r = 8 - Number(sq[1]);
    const cell = boardGrid[r]?.[f];
    if (!cell) {
      return null;
    }
    return { type: cell.type as PieceType, color: cell.color as PieceColor };
  };

  const kingShakeSq = inCheck ? findKingSquare(chess, turn as PieceColor) : null;

  const handleContextMenu = useCallback((): void => {
    onCancelPremove?.();
  }, [onCancelPremove]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => {
        if (!interactive) {
          return;
        }
        setDragPiece(e.active.data.current as typeof dragPiece);
      }}
      onDragEnd={onDragEnd}
    >
      <div className="relative w-full max-w-[min(92vw,640px)]">
        {analysisMode ? (
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => setManualFlip((v) => !v)}
              className="rounded-md border border-royal-surface-elevated bg-royal-surface px-3 py-1.5 text-xs text-royal-muted transition hover:border-royal-gold hover:text-royal-gold"
            >
              Retourner l&apos;échiquier
            </button>
          </div>
        ) : null}
        {moveError ? <p className="mb-2 text-center text-sm text-royal-danger">{moveError}</p> : null}
        <div className="relative pl-5 pb-5">
          <div className="absolute bottom-5 left-0 top-0 flex w-4 flex-col justify-around text-[10px] font-medium text-royal-muted">
            {ranks.map((rk) => (
              <span key={rk} className="text-right">
                {rk}
              </span>
            ))}
          </div>
          <div className={cn("aspect-square w-full", !interactive && "pointer-events-none")}>
            <div className="grid h-full w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-lg border-2 border-royal-surface-elevated shadow-xl">
              {ranks.map((rk) =>
                files.map((fl) => {
                  const sq = squareAt(fl, rk);
                  const isLight = (fl.charCodeAt(0) + rk) % 2 === 0;
                  const pc = squarePiece(sq);
                  const isSelected = selectedSquare === sq;
                  const isLegal = legalMoves.includes(sq);
                  const isLast = !!lastMove && (lastMove.from === sq || lastMove.to === sq);
                  const premoveH = !!premove && (premove.from === sq || premove.to === sq);
                  const canDrag = interactive && !!pc && !analysisMode && isMyTurn && pc.color === myColor && !promotion;
                  return (
                    <div
                      key={sq}
                      className={premoveH ? "ring-2 ring-inset ring-[color:rgba(255,140,0,0.45)]" : undefined}
                    >
                      <ChessSquare
                        square={sq}
                        isLight={isLight}
                        isLegalTarget={isLegal}
                        isSelected={isSelected}
                        isLastMove={isLast}
                        onSquareClick={handleSquareClick}
                        onContextMenu={handleContextMenu}
                      >
                        {pc ? (
                          <div className={kingShakeSq === sq ? "animate-king-shake" : undefined}>
                            <ChessPiece square={sq} type={pc.type} color={pc.color} disabled={!canDrag} />
                          </div>
                        ) : null}
                      </ChessSquare>
                    </div>
                  );
                }),
              )}
            </div>
          </div>
          <div className="absolute bottom-0 left-5 right-0 flex justify-between text-[10px] font-medium uppercase tracking-wider text-royal-muted">
            {files.map((f) => (
              <span key={f} className="flex-1 text-center">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {dragPiece ? (
          <div className="size-16 opacity-90">
            <ChessPiece square={dragPiece.square} type={dragPiece.type} color={dragPiece.color} disabled />
          </div>
        ) : null}
      </DragOverlay>
      <PromotionModal
        open={!!promotion}
        color={promotion?.color ?? "w"}
        onPick={(p) => {
          if (!promotion) {
            return;
          }
          submitMove(promotion.from, promotion.to, p, promotion.mode);
          setPromotion(null);
        }}
        onCancel={() => setPromotion(null)}
      />
    </DndContext>
  );
}
