import type { GameState } from "@royalchess/shared";
import { cuidSchema } from "@royalchess/shared";
import { mapPublicGameToInitialState, type PublicGameDetailDto } from "@/lib/public-game-mapper";

/**
 * Résultat discriminant pour distinguer :
 *  - `ok`        : la partie est terminée → snapshot complet utilisable côté SSR.
 *  - `pending`   : la partie existe mais n'est pas encore terminée (status WAITING/ACTIVE)
 *                  ou erreur réseau transitoire → laisser le WebSocket hydrater le store.
 *  - `not_found` : id syntaxiquement invalide (non-cuid), partie absente ou supprimée
 *                  → la page appelante DOIT appeler `notFound()` pour éviter d'afficher
 *                  un échiquier vide indéfiniment (cf. URLs fantômes dans l'historique
 *                  utilisateur).
 */
export type PublicGameFetchResult =
  | { kind: "ok"; state: GameState }
  | { kind: "pending" }
  | { kind: "not_found" };

export async function fetchPublicGameSnapshot(gameId: string): Promise<PublicGameFetchResult> {
  if (!cuidSchema.safeParse(gameId).success) {
    return { kind: "not_found" };
  }
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
  if (!base) {
    return { kind: "pending" };
  }
  try {
    const res = await fetch(`${base}/games/${gameId}`, {
      next: { revalidate: 0 },
      headers: { Accept: "application/json" },
    });
    if (res.status === 404 || res.status === 400) {
      return { kind: "not_found" };
    }
    if (!res.ok) {
      return { kind: "pending" };
    }
    const dto = (await res.json()) as PublicGameDetailDto;
    return { kind: "ok", state: mapPublicGameToInitialState(dto) };
  } catch {
    return { kind: "pending" };
  }
}
