"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Chess, FLAGS, type ChessInstance, type Move, type Square as JsSquare } from "chess.js";
import type { MoveInput, PieceColor, PieceType, Square } from "@royalchess/shared";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useShallow } from "zustand/shallow";
import { ChessPiece } from "@/components/board/chess-piece";
import { ChessSquare } from "@/components/board/chess-square";
import type {
  ChessBoardGameSlice,
  ChessBoardProps,
  ChessBoardUiSlice,
  ChessBoardViewProps,
} from "@/components/board/chess-board.types";
import { PromotionModal } from "@/components/board/promotion-modal";
import { formatPieceFrenchLabel, formatSquareAriaLabel } from "@/lib/aria-piece-label";
import { displayFiles, displayRanks, squareAt } from "@/lib/board-display";
import { pseudoLegalTargets } from "@/lib/premove-helpers";
import { playChessSound } from "@/lib/chess-sounds";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";
import { useGameStore, type RejectedMoveFlashState } from "@/stores/game.store";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

type GameStoreSnapshot = ReturnType<typeof useGameStore.getState>;
type UiStoreSnapshot = ReturnType<typeof useUiStore.getState>;

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

function selectBoardGameSlice(s: GameStoreSnapshot): ChessBoardGameSlice {
  return {
    gameFen: s.gameState?.fen ?? null,
    gameLastMove: s.gameState?.lastMove ?? null,
    gameStatus: s.gameState?.status ?? null,
    selectedSquare: s.selectedSquare,
    legalMoves: s.legalMoves,
    premove: s.premove,
    myColor: s.myColor,
    isMyTurn: s.isMyTurn,
    moveError: s.moveError,
    optimisticFen: s.optimisticFen,
    optimisticLastMove: s.optimisticLastMove,
    rejectedMove: s.rejectedMove,
    setSelectedSquare: s.setSelectedSquare,
    setLegalMoves: s.setLegalMoves,
  };
}

function selectBoardUiSlice(s: UiStoreSnapshot): ChessBoardUiSlice {
  return {
    soundEnabled: s.soundEnabled,
    pieceTheme: s.pieceTheme,
    showLegalMoves: s.showLegalMoves,
    pieceAnimationsEnabled: s.pieceAnimationsEnabled,
  };
}

function moveInputKey(m: MoveInput | null): string {
  if (!m) {
    return "";
  }
  return `${m.from}:${m.to}:${m.promotion ?? ""}`;
}

function rejectedFlashKey(r: RejectedMoveFlashState | null): string {
  if (!r) {
    return "";
  }
  return `${r.from}:${r.to}:${r.at}`;
}

function sortedLegalKey(moves: readonly Square[]): string {
  return [...moves].sort().join(",");
}

function resolvedFen(
  controlled: string | null | undefined,
  optimistic: string | null,
  game: string | null,
): string {
  const cf = controlled && controlled.length > 0 ? controlled : null;
  return cf ?? optimistic ?? game ?? START_FEN;
}

function chessBoardViewPropsEqual(prev: ChessBoardViewProps, next: ChessBoardViewProps): boolean {
  if (prev.gameId !== next.gameId) {
    return false;
  }
  if (prev.analysisMode !== next.analysisMode) {
    return false;
  }
  if (prev.controlledFen !== next.controlledFen) {
    return false;
  }
  if (prev.interactive !== next.interactive) {
    return false;
  }
  if (prev.onMove !== next.onMove) {
    return false;
  }
  if (prev.onCancelPremove !== next.onCancelPremove) {
    return false;
  }
  if (prev.onQueuePremove !== next.onQueuePremove) {
    return false;
  }

  const fenA = resolvedFen(prev.controlledFen, prev.board.optimisticFen, prev.board.gameFen);
  const fenB = resolvedFen(next.controlledFen, next.board.optimisticFen, next.board.gameFen);
  if (fenA !== fenB) {
    return false;
  }

  const lastA = prev.board.optimisticLastMove ?? prev.board.gameLastMove;
  const lastB = next.board.optimisticLastMove ?? next.board.gameLastMove;
  if (moveInputKey(lastA) !== moveInputKey(lastB)) {
    return false;
  }

  const orientA = `${Boolean(prev.analysisMode)}:${prev.board.myColor ?? ""}`;
  const orientB = `${Boolean(next.analysisMode)}:${next.board.myColor ?? ""}`;
  if (orientA !== orientB) {
    return false;
  }

  if (prev.board.selectedSquare !== next.board.selectedSquare) {
    return false;
  }
  if (sortedLegalKey(prev.board.legalMoves) !== sortedLegalKey(next.board.legalMoves)) {
    return false;
  }
  if (moveInputKey(prev.board.premove) !== moveInputKey(next.board.premove)) {
    return false;
  }
  if (rejectedFlashKey(prev.board.rejectedMove) !== rejectedFlashKey(next.board.rejectedMove)) {
    return false;
  }

  if (prev.board.myColor !== next.board.myColor) {
    return false;
  }
  if (prev.board.isMyTurn !== next.board.isMyTurn) {
    return false;
  }
  if (prev.board.moveError !== next.board.moveError) {
    return false;
  }
  if (prev.board.gameStatus !== next.board.gameStatus) {
    return false;
  }

  if (prev.ui.soundEnabled !== next.ui.soundEnabled) {
    return false;
  }
  if (prev.ui.pieceTheme !== next.ui.pieceTheme) {
    return false;
  }
  if (prev.ui.showLegalMoves !== next.ui.showLegalMoves) {
    return false;
  }
  if (prev.ui.pieceAnimationsEnabled !== next.ui.pieceAnimationsEnabled) {
    return false;
  }

  return true;
}

const ChessBoardView = memo(function ChessBoardViewImpl({
  gameId,
  analysisMode = false,
  controlledFen = null,
  interactive = true,
  onMove,
  onCancelPremove,
  onQueuePremove,
  board,
  ui,
}: ChessBoardViewProps): ReactElement {
  void gameId;
  const {
    gameFen,
    gameLastMove,
    gameStatus,
    selectedSquare,
    legalMoves,
    premove,
    myColor,
    isMyTurn,
    moveError,
    optimisticFen,
    optimisticLastMove,
    rejectedMove,
    setSelectedSquare,
    setLegalMoves,
  } = board;
  const { soundEnabled, pieceTheme, showLegalMoves, pieceAnimationsEnabled } = ui;

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
    gameFen ??
    START_FEN;
  const chess = useMemo(() => buildChess(fen), [fen]);

  const viewFlipped = analysisMode ? manualFlip : myColor === "b";

  const ranks = displayRanks(viewFlipped);
  const files = displayFiles(viewFlipped);

  const lastMove = optimisticLastMove ?? gameLastMove ?? null;

  useEffect(() => {
    if (optimisticFen) {
      prevFenRef.current = fen;
      return;
    }
    if (!gameLastMove) {
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
      from: gameLastMove.from as JsSquare,
      to: gameLastMove.to as JsSquare,
      promotion: gameLastMove.promotion,
    });
    if (m) {
      if (probe.in_check()) {
        void playChessSound("check", soundEnabled);
      } else {
        void playChessSound(classifySound(m), soundEnabled);
      }
    }
    prevFenRef.current = fen;
  }, [fen, gameLastMove, soundEnabled, optimisticFen]);

  useEffect(() => {
    if (gameStatus === "completed" || gameStatus === "abandoned") {
      void playChessSound("gameEnd", soundEnabled);
    }
  }, [gameStatus, soundEnabled]);

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

  const onDragStart = useCallback(
    (e: DragStartEvent): void => {
      if (!interactive) {
        return;
      }
      const payload = e.active.data.current as { square: Square; type: PieceType; color: PieceColor } | null;
      setDragPiece(payload);
      if (payload) {
        const label = formatPieceFrenchLabel(payload.type, payload.color);
        setDragAnnounce(`${label} sélectionné, case ${payload.square}. Glisser pour déplacer.`);
      }
    },
    [interactive],
  );

  const onDragCancel = useCallback((): void => {
    setDragPiece(null);
    if (interactive) {
      setDragAnnounce("Coup annulé.");
    }
  }, [interactive]);

  const toggleManualFlip = useCallback((): void => {
    setManualFlip((v) => !v);
  }, []);

  const onPromotionPick = useCallback(
    (p: NonNullable<MoveInput["promotion"]>): void => {
      if (!promotion) {
        return;
      }
      submitMove(promotion.from, promotion.to, p, promotion.mode);
      setPromotion(null);
    },
    [promotion, submitMove],
  );

  const onPromotionCancel = useCallback((): void => {
    setPromotion(null);
  }, []);

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
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragCancel={onDragCancel} onDragEnd={onDragEnd}>
      <div className="w-full">
        <div aria-live="polite" className="sr-only">
          {dragAnnounce}
        </div>
        {analysisMode ? (
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={toggleManualFlip}
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
        onPick={onPromotionPick}
        onCancel={onPromotionCancel}
      />
    </DndContext>
  );
}, chessBoardViewPropsEqual);

export function ChessBoard(props: ChessBoardProps): ReactElement {
  const board = useGameStore(useShallow(selectBoardGameSlice));
  const ui = useUiStore(useShallow(selectBoardUiSlice));
  return <ChessBoardView {...props} board={board} ui={ui} />;
}

export type { ChessBoardProps } from "@/components/board/chess-board.types";
