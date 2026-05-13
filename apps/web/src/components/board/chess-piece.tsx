"use client";

import { useDraggable } from "@dnd-kit/core";
import Image from "next/image";
import type { PieceColor, PieceType, Square } from "@royalchess/shared";
import type { CSSProperties, ReactElement } from "react";
import { CSS } from "@dnd-kit/utilities";
import { formatPieceFrenchLabel } from "@/lib/aria-piece-label";
import { cn } from "@/lib/utils";

export interface ChessPieceProps {
  readonly square: Square;
  readonly type: PieceType;
  readonly color: PieceColor;
  readonly theme?: string;
  readonly pieceAnimationsEnabled?: boolean;
  readonly disabled: boolean;
}

export function ChessPiece({
  square,
  type,
  color,
  theme = "classic",
  pieceAnimationsEnabled = true,
  disabled,
}: ChessPieceProps): ReactElement {
  const id = `piece-${square}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { square, type, color },
    disabled,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.25 : 1,
    zIndex: isDragging ? 50 : 1,
    touchAction: "none",
  };

  const fileName = `${color === "w" ? "w" : "b"}${type.toUpperCase()}`;
  const src = `/pieces/${theme}/${fileName}.svg`;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      disabled={disabled}
      className={cn(
        pieceAnimationsEnabled && "piece-transition",
        "relative flex size-full items-center justify-center bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-gold/80",
        disabled && "cursor-default opacity-90",
        !disabled && "cursor-grab active:cursor-grabbing",
      )}
      aria-label={`${formatPieceFrenchLabel(type, color)}, case ${square}`}
    >
      <Image src={src} alt="" width={72} height={72} className="pointer-events-none size-[82%] select-none object-contain drop-shadow-md" unoptimized />
    </button>
  );
}
