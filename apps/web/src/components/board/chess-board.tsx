"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Chess, FLAGS, type ChessInstance, type Move, type Square as JsSquare } from "chess.js";
import type { MoveInput, PieceColor, PieceType, Square } from "@royalchess/shared";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { ChessPiece } from "@/components/board/chess-piece";
import { ChessSquare } from "@/components/board/chess-square";
import { PromotionModal } from "@/components/board/promotion-modal";
import { formatPieceFrenchLabel, formatSquareAriaLabel } from "@/lib/aria-piece-label";
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
}: ChessBoardProps): ReactElement {
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
  const optimisticFen = useGameStore((s) => s.optimisticFen);
  const optimisticLastMove = useGameStore((s) => s.optimisticLastMove);
  const rejectedMove = useGameStore((s) => s.rejectedMove);
  const soundEnabled = useUiStore((s) => s.soundEnabled);
  const pieceTheme = useUiStore((s) => s.pieceTheme);
  const showLegalMoves = useUiStore((s) => s.showLegalMoves);
  const pieceAnimationsEnabled = useUiStore((s) => s.pieceAnimationsEnabled);

  const [manualFlip, setManualFlip] = useState(false);
  const [promotion, setPromotion] = useState<{
    from: Square;
    to: Square;
    color: PieceColor;
    mode: "play" | "premove";
  } | null>(null);
  const [dragPiece, setDragPiece] = useState<{ square: Square; type: PieceType; color: PieceColor } | null>(null);
  const [dragAnnounce, setDragAnnounce] = useState<string>("");
  const prevFenRef = useRef<string | null>(null);

  const fen =
    (controlledFen && controlledFen.length > 0 ? controlledFen : null) ??
    optimisticFen ??
    gameState?.fen ??
    START_FEN;
  const chess = useMemo(() => buildChess(fen), [fen]);

  const viewFlipped = analysisMode ? manualFlip : myColor === "b";

  const ranks = displayRanks(viewFlipped);
  const files = displayFiles(viewFlipped);

  const lastMove = optimisticLastMove ?? gameState?.lastMove ?? null;

  useEffect(() => {
    if (optimisticFen) {
      prevFenRef.current = fen;
      return;
    }
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
  }, [fen, gameState?.lastMove, gameState, soundEnabled, optimisticFen]);

  useEffect(() => {
    if (gameState?.status === "completed" || gameState?.status === "abandoned") {
      void playChessSound("gameEnd", soundEnabled);
    }
  }, [gameState?.status, soundEnabled]);

  const inCheck = chess.in_check();
  const inCheckmate = chess.in_checkmate();
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
      const promotionArg = (promotionPick ?? match.promotion) as MoveInput["promotion"] | undefined;
      const m = probe.move({
        from: from as JsSquare,
        to: to as JsSquare,
        promotion: promotionArg,
      });
      if (m) {
        const promotionOut: MoveInput["promotion"] | undefined =
          (m.promotion as MoveInput["promotion"] | undefined) ?? promotionArg;
        useGameStore.getState().setOptimistic(probe.fen(), { from, to, promotion: promotionOut });
        if (probe.in_check()) {
          void playChessSound("check", soundEnabled);
        } else {
          void playChessSound(classifySound(m), soundEnabled);
        }
      }
      onMove({ from, to, promotion: promotionArg });
      clearSelection();
    },
    [fen, onMove, onQueuePremove, chess, clearSelection, myColor, soundEnabled],
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
        setDragPiece(null);
        return;
      }
      setDragPiece(null);
      const active = e.active.data.current as { square: Square; type: PieceType; color: PieceColor } | undefined;
      if (!active) {
        return;
      }
      const label = formatPieceFrenchLabel(active.type, active.color);
      const overId = e.over?.id;
      if (typeof overId !== "string" || !overId.startsWith("sq-")) {
        setDragAnnounce("Coup annulé.");
        return;
      }
      const to = overId.replace("sq-", "") as Square;
      if (active.square === to) {
        setDragAnnounce("Coup annulé.");
        return;
      }
      setDragAnnounce(`${label} déplacé de ${active.square} à ${to}.`);
      const premoveMode = !!(onQueuePremove && !isMyTurn && myColor);
      submitMove(active.square, to, undefined, premoveMode ? "premove" : "play");
    },
    [interactive, isMyTurn, myColor, onQueuePremove, submitMove],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
        const payload = e.active.data.current as { square: Square; type: PieceType; color: PieceColor } | null;
        setDragPiece(payload);
        if (payload) {
          const label = formatPieceFrenchLabel(payload.type, payload.color);
          setDragAnnounce(`${label} sélectionné, case ${payload.square}. Glisser pour déplacer.`);
        }
      }}
      onDragCancel={() => {
        setDragPiece(null);
        if (interactive) {
          setDragAnnounce("Coup annulé.");
        }
      }}
      onDragEnd={onDragEnd}
    >
      <div className="w-full">
        <div aria-live="polite" className="sr-only">
          {dragAnnounce}
        </div>
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
        {inCheckmate ? (
          <div role="alert" className="mb-2 text-center text-sm font-semibold text-royal-danger">
            Échec et mat
          </div>
        ) : inCheck ? (
          <div role="alert" className="mb-2 text-center text-sm font-semibold text-royal-danger">
            Échec !
          </div>
        ) : null}
        <div className="relative aspect-square w-full max-w-[min(100vw,calc(100vh-160px))] pl-5 pb-5">
          <div className="absolute bottom-5 left-0 top-0 flex w-4 flex-col justify-around text-[10px] font-medium text-royal-muted">
            {ranks.map((rk) => (
              <span key={rk} className="text-right">
                {rk}
              </span>
            ))}
          </div>
          <div className={cn("aspect-square w-full", !interactive && "pointer-events-none")}>
            <div
              role="grid"
              aria-label="Échiquier"
              aria-rowcount={8}
              aria-colcount={8}
              className="grid h-full w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-lg border-2 border-royal-surface-elevated shadow-xl"
            >
              {ranks.map((rk) =>
                files.map((fl) => {
                  const sq = squareAt(fl, rk);
                  const isLight = (fl.charCodeAt(0) + rk) % 2 === 0;
                  const pc = squarePiece(sq);
                  const isSelected = selectedSquare === sq;
                  const isLegal = showLegalMoves && legalMoves.includes(sq);
                  const isLast = !!lastMove && (lastMove.from === sq || lastMove.to === sq);
                  const premoveH = !!premove && (premove.from === sq || premove.to === sq);
                  const isRejectFlash =
                    rejectedMove !== null && (rejectedMove.from === sq || rejectedMove.to === sq);
                  const canDrag = interactive && !!pc && !analysisMode && isMyTurn && pc.color === myColor && !promotion;
                  return (
                    <div
                      key={sq}
                      className={premoveH ? "ring-2 ring-inset ring-[color:rgba(255,140,0,0.45)]" : undefined}
                    >
                      <ChessSquare
                        square={sq}
                        ariaLabel={formatSquareAriaLabel(sq, pc)}
                        isLight={isLight}
                        isLegalTarget={isLegal}
                        isSelected={isSelected}
                        isLastMove={isLast}
                        rejectFlash={isRejectFlash}
                        onSquareClick={handleSquareClick}
                        onContextMenu={handleContextMenu}
                      >
                        {pc ? (
                          <div className={pieceAnimationsEnabled && kingShakeSq === sq ? "animate-king-shake" : undefined}>
                            <ChessPiece
                              square={sq}
                              type={pc.type}
                              color={pc.color}
                              theme={pieceTheme}
                              pieceAnimationsEnabled={pieceAnimationsEnabled}
                              disabled={!canDrag}
                            />
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
            <ChessPiece
              square={dragPiece.square}
              type={dragPiece.type}
              color={dragPiece.color}
              theme={pieceTheme}
              pieceAnimationsEnabled={pieceAnimationsEnabled}
              disabled
            />
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
