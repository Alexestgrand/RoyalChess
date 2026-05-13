"use client";

import type { MoveInput, PieceColor } from "@royalchess/shared";
import Image from "next/image";
import type { ReactElement } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";

const OPTIONS: readonly { promotion: NonNullable<MoveInput["promotion"]>; label: string; file: string }[] = [
  { promotion: "q", label: "Dame", file: "Q" },
  { promotion: "r", label: "Tour", file: "R" },
  { promotion: "b", label: "Fou", file: "B" },
  { promotion: "n", label: "Cavalier", file: "N" },
];

export interface PromotionModalProps {
  readonly open: boolean;
  readonly color: PieceColor;
  readonly onPick: (p: NonNullable<MoveInput["promotion"]>) => void;
  readonly onCancel: () => void;
}

export function PromotionModal({ open, color, onPick, onCancel }: PromotionModalProps): ReactElement {
  const pieceTheme = useUiStore((s) => s.pieceTheme);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onCancel();
        }
      }}
    >
      <DialogContent className="max-w-sm border-royal-gold/30 bg-royal-surface-elevated sm:max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Promotion</DialogTitle>
          <DialogDescription>Choisissez la pièce pour remplacer le pion.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-3 pt-2">
          {OPTIONS.map((o) => (
            <button
              key={o.promotion}
              type="button"
              onClick={() => onPick(o.promotion)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border border-royal-surface bg-royal-surface p-3 transition",
                "hover:border-royal-gold hover:bg-royal-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-gold",
              )}
            >
              <Image
                src={`/pieces/${pieceTheme}/${color === "w" ? "w" : "b"}${o.file}.svg`}
                alt=""
                width={56}
                height={56}
                className="size-12 object-contain"
                unoptimized
              />
              <span className="text-xs text-royal-muted">{o.label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
