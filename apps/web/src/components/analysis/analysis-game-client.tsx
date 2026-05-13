"use client";

import type { ParsedGame } from "@royalchess/shared";
import { Chess } from "chess.js";
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { ChessBoard } from "@/components/board/chess-board";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useStockfish } from "@/hooks/use-stockfish";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function buildFens(moves: readonly string[]): string[] {
  const c = Chess();
  const fens: string[] = [c.fen()];
  for (const san of moves) {
    const m = c.move(san, { sloppy: true });
    if (!m) {
      break;
    }
    fens.push(c.fen());
  }
  return fens;
}

export function AnalysisGameClient({ data, gameId }: Readonly<{ data: ParsedGame; gameId: string }>): React.ReactElement {
  const fens = useMemo(() => buildFens(data.sanMoves), [data.sanMoves]);
  const [ply, setPly] = useState(fens.length - 1);
  const [depth, setDepth] = useState(16);
  const { analyze, evaluation, bestMove, principalVariation, isAnalyzing } = useStockfish();

  const fen = fens[Math.min(ply, fens.length - 1)] ?? START;

  const runAnalysis = useCallback((): void => {
    void analyze(fen, depth);
  }, [analyze, fen, depth]);

  const evalLabel =
    evaluation === null ? "—" : `${(evaluation / 100).toFixed(2)} pions (approx.)`;

  const evalBarHeight = evaluation === null ? 50 : 50 + Math.max(-8, Math.min(8, evaluation / 80)) * 5;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex flex-1 flex-col items-center gap-4">
        <ChessBoard
          gameId={`analysis-${gameId}`}
          analysisMode
          controlledFen={fen}
          interactive={false}
          onMove={() => undefined}
        />
        {bestMove ? (
          <p className="text-center font-mono text-sm text-royal-gold">
            Meilleur coup (UCI) : <span className="text-royal-ivory">{bestMove}</span>
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setPly(0)} aria-label="Premier coup">
            <ChevronFirst className="size-4" />
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setPly((p) => Math.max(0, p - 1))} aria-label="Coup précédent">
            <ChevronLeft className="size-4" />
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setPly((p) => Math.min(fens.length - 1, p + 1))} aria-label="Coup suivant">
            <ChevronRight className="size-4" />
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setPly(fens.length - 1)} aria-label="Dernier coup">
            <ChevronLast className="size-4" />
          </Button>
        </div>
      </div>

      <aside className="w-full max-w-sm space-y-4 rounded-xl border border-royal-surface-elevated bg-royal-surface p-4">
        <div className="flex gap-3">
          <div className="relative h-40 w-3 overflow-hidden rounded-full bg-royal-surface-elevated">
            <div className="absolute bottom-0 left-0 right-0 bg-royal-gold/80 transition-all duration-500" style={{ height: `${evalBarHeight}%` }} />
          </div>
          <div className="flex-1 space-y-2">
            <p className="font-display text-sm font-semibold text-royal-gold">Stockfish</p>
            <p className="text-xs text-royal-muted">{isAnalyzing ? "Analyse en cours…" : evalLabel}</p>
            <p className="break-all font-mono text-[11px] leading-relaxed text-royal-ivory">
              {principalVariation.length ? principalVariation.join(" ") : "—"}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-royal-muted">
            <span>Profondeur</span>
            <span>{depth}</span>
          </div>
          <Slider value={[depth]} min={10} max={25} step={1} onValueChange={(v) => setDepth(v[0] ?? 16)} />
        </div>
        <Button type="button" variant="royal" className="w-full" onClick={runAnalysis} disabled={isAnalyzing}>
          Lancer l&apos;analyse
        </Button>
      </aside>
    </div>
  );
}
