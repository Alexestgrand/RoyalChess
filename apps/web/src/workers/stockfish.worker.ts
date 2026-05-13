/**
 * Protocole optionnel pour un worker Stockfish dédié (bridge UCI).
 * L’application utilise par défaut le worker officiel dans `/public/vendor/stockfish/`.
 */
export type StockfishWorkerRequest = { readonly type: "analyze"; readonly fen: string; readonly depth: number };

export type StockfishWorkerResponse = {
  readonly type: "result";
  readonly bestMove: string | null;
  readonly evaluation: number | null;
  readonly principalVariation: readonly string[];
};
