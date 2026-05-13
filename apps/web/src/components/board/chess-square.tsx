"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Square } from "@royalchess/shared";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ChessSquareProps {
  readonly square: Square;
  /** Libellé vocal complet de la case (ex. « Case e4, Pion blanc »). */
  readonly ariaLabel: string;
  readonly isLight: boolean;
  readonly isLegalTarget: boolean;
  readonly isSelected: boolean;
  readonly isLastMove: boolean;
  /** Refus serveur : flash rouge bref sur la case. */
  readonly rejectFlash?: boolean;
  readonly children?: ReactNode;
  readonly onSquareClick: (sq: Square) => void;
  readonly onContextMenu?: (sq: Square) => void;
}

export function ChessSquare({
  square,
  ariaLabel,
  isLight,
  isLegalTarget,
  isSelected,
  isLastMove,
  rejectFlash = false,
  children,
  onSquareClick,
  onContextMenu,
}: ChessSquareProps): ReactElement {
  const { isOver, setNodeRef } = useDroppable({ id: `sq-${square}` });

  return (
    <div
      ref={setNodeRef}
      role="gridcell"
      aria-label={ariaLabel}
      aria-selected={isSelected ? true : undefined}
      onClick={() => onSquareClick(square)}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(square);
        }
      }}
      className={cn(
        "relative flex aspect-square items-center justify-center outline-none transition-colors",
        isLight ? "bg-royal-board-light" : "bg-royal-board-dark",
        isSelected && "ring-2 ring-inset ring-[color:var(--royal-board-selected)]",
        isLastMove && "shadow-[inset_0_0_0_4px_rgba(205,210,106,0.4)]",
        rejectFlash && "animate-flash-reject",
        isLegalTarget && "after:absolute after:inset-[28%] after:rounded-full after:bg-royal-board-legal after:content-['']",
        isLegalTarget && "animate-legal-pulse",
        isOver && "brightness-110",
      )}
    >
      {children}
    </div>
  );
}
