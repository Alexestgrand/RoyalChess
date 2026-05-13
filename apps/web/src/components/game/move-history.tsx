"use client";

import { Chess } from "chess.js";
import { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";

export interface MoveHistoryProps {
  readonly pgn: string;
  readonly analysisMode?: boolean;
  readonly currentPly?: number;
  readonly onGoToPly?: (ply: number) => void;
}

export function MoveHistory({
  pgn,
  analysisMode = false,
  currentPly,
  onGoToPly,
}: MoveHistoryProps): React.ReactElement {
  const moves = useMemo(() => {
    const c = Chess();
    if (!pgn || !pgn.trim()) {
      return [] as string[];
    }
    const ok = c.load_pgn(pgn, { sloppy: true });
    if (!ok) {
      return [] as string[];
    }
    return c.history();
  }, [pgn]);

  const rows: { w?: string; b?: string; i: number }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ i: Math.floor(i / 2) + 1, w: moves[i], b: moves[i + 1] });
  }

  const activeIdx = currentPly ?? Math.max(0, moves.length - 1);

  const handleClick = useCallback(
    (idx: number): void => {
      if (analysisMode && onGoToPly) {
        onGoToPly(idx);
      }
    },
    [analysisMode, onGoToPly],
  );

  return (
    <div className="max-h-48 overflow-y-auto rounded-lg border border-royal-surface-elevated bg-royal-bg/40 p-2 font-mono text-xs text-royal-ivory">
      {rows.length === 0 ? <p className="text-royal-muted">Aucun coup pour le moment.</p> : null}
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.i} className="flex gap-2">
            <span className="w-6 shrink-0 text-royal-muted">{r.i}.</span>
            <button
              type="button"
              disabled={!analysisMode}
              onClick={() => handleClick((r.i - 1) * 2)}
              className={cn(
                "min-w-[2.5rem] rounded px-1 text-left",
                analysisMode && "hover:bg-royal-surface-elevated",
                activeIdx === (r.i - 1) * 2 && "bg-royal-gold/25 text-royal-gold",
              )}
            >
              {r.w ?? ""}
            </button>
            {r.b ? (
              <button
                type="button"
                disabled={!analysisMode}
                onClick={() => handleClick((r.i - 1) * 2 + 1)}
                className={cn(
                  "min-w-[2.5rem] rounded px-1 text-left",
                  analysisMode && "hover:bg-royal-surface-elevated",
                  activeIdx === (r.i - 1) * 2 + 1 && "bg-royal-gold/25 text-royal-gold",
                )}
              >
                {r.b}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
