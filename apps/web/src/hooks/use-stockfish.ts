"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface StockfishAnalyzeResult {
  readonly bestMove: string | null;
  readonly evaluation: number | null;
  readonly principalVariation: readonly string[];
}

function mateToCentipawn(mate: number): number {
  return mate > 0 ? 10_000 - mate * 100 : -10_000 - mate * 100;
}

function createStockfishWorker(): Worker {
  const origin = window.location.origin;
  const wasm = encodeURIComponent(`${origin}/vendor/stockfish/stockfish-18-lite-single.wasm`);
  return new Worker(`${origin}/vendor/stockfish/stockfish-18-lite-single.js#${wasm},worker`);
}

export function useStockfish(): {
  analyze: (fen: string, depth: number) => Promise<StockfishAnalyzeResult>;
  evaluation: number | null;
  bestMove: string | null;
  principalVariation: readonly string[];
  isAnalyzing: boolean;
} {
  const workerRef = useRef<Worker | null>(null);
  const [evaluation, setEvaluation] = useState<number | null>(null);
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [principalVariation, setPrincipalVariation] = useState<readonly string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const w = createStockfishWorker();
    workerRef.current = w;
    w.postMessage("uci");
    w.postMessage("isready");
    return () => {
      w.postMessage("quit");
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  const analyze = useCallback((fen: string, depth: number): Promise<StockfishAnalyzeResult> => {
    const w = workerRef.current;
    return new Promise((resolve, reject) => {
      if (!w) {
        reject(new Error("stockfish_worker_indisponible"));
        return;
      }
      setIsAnalyzing(true);
      let lastEval: number | null = null;
      let lastPv: readonly string[] = [];
      let resolved = false;

      const finish = (bm: string | null, ev: number | null, pv: readonly string[]): void => {
        if (resolved) {
          return;
        }
        resolved = true;
        setBestMove(bm);
        setEvaluation(ev);
        setPrincipalVariation(pv);
        setIsAnalyzing(false);
        w.removeEventListener("message", onLine);
        resolve({ bestMove: bm, evaluation: ev, principalVariation: pv });
      };

      const onLine = (e: MessageEvent): void => {
        const line = String(e.data).trim();
        if (line.startsWith("info ")) {
          const cp = line.match(/\bscore cp (-?\d+)/);
          const mate = line.match(/\bscore mate (-?\d+)/);
          if (cp) {
            lastEval = Number(cp[1]);
          } else if (mate) {
            lastEval = mateToCentipawn(Number(mate[1]));
          }
          const pvMatch = line.match(/\bpv (.+)$/);
          if (pvMatch?.[1]) {
            lastPv = pvMatch[1].split(/\s+/).filter(Boolean).slice(0, 16);
          }
        }
        if (line.startsWith("bestmove ")) {
          const parts = line.split(/\s+/);
          const bm = parts[1];
          const ok = bm && bm !== "(none)";
          finish(ok ? bm : null, lastEval, lastPv);
        }
      };

      w.addEventListener("message", onLine);
      w.postMessage("stop");
      w.postMessage(`position fen ${fen}`);
      w.postMessage(`go depth ${depth}`);
    });
  }, []);

  return { analyze, evaluation, bestMove, principalVariation, isAnalyzing };
}
