import { auth } from "@/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactElement } from "react";
import { formatEndReason } from "@/lib/game-end-reason-labels";
import { EmptyChessBoard } from "@/components/shared/empty-chess-board";

// ─── Labels ──────────────────────────────────────────────────────────────────

const TC_LABELS: Readonly<Record<string, string>> = {
  BULLET: "Bullet",
  BLITZ: "Blitz",
  RAPID: "Rapide",
  CLASSICAL: "Classique",
  CORRESPONDENCE: "Correspondance",
};

// ─── DTOs ─────────────────────────────────────────────────────────────────────

interface PublicProfileDto {
  readonly id: string;
  readonly username: string;
  readonly avatarUrl: string | null;
  readonly createdAt: string;
  readonly stats: { gamesPlayed: number };
  readonly eloRatings: { timeControl: string; rating: number; gamesPlayed: number }[];
}

interface ProfileGamePlayerDto {
  readonly id: string;
  readonly username: string;
  readonly avatarUrl: string | null;
}

interface ProfileGameDto {
  readonly id: string;
  readonly status: string;
  readonly winner: string | null;
  readonly timeControl: string;
  readonly initialTime: number;
  readonly increment: number;
  readonly startedAt: string | null;
  readonly endedAt: string | null;
  readonly endReason: string | null;
  readonly fen: string | null;
  readonly whitePlayer: ProfileGamePlayerDto;
  readonly blackPlayer: ProfileGamePlayerDto | null;
  readonly whiteEloChange: number | null;
  readonly blackEloChange: number | null;
  readonly whiteEloAfter: number | null;
  readonly blackEloAfter: number | null;
}

interface PaginatedGames {
  readonly items: readonly ProfileGameDto[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function apiBase(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
}

async function fetchPublicProfile(username: string): Promise<PublicProfileDto | null> {
  const encoded = encodeURIComponent(username);
  try {
    const res = await fetch(`${apiBase()}/users/${encoded}`, {
      next: { revalidate: 30 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicProfileDto;
  } catch {
    return null;
  }
}

async function fetchGameHistory(username: string, page: number): Promise<PaginatedGames> {
  const encoded = encodeURIComponent(username);
  const limit = 20;
  try {
    const res = await fetch(`${apiBase()}/users/${encoded}/games?page=${page}&limit=${limit}`, {
      next: { revalidate: 10 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { items: [], total: 0, page, limit };
    return (await res.json()) as PaginatedGames;
  } catch {
    return { items: [], total: 0, page, limit };
  }
}

function formatTimeControl(tc: string, initialTime: number, increment: number): string {
  const label = TC_LABELS[tc] ?? tc;
  const minutes = Math.floor(initialTime / 60);
  return `${label} ${minutes}+${increment}`;
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  const fmt = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  if (diffSec < 60) return fmt.format(-diffSec, "second");
  if (diffMin < 60) return fmt.format(-diffMin, "minute");
  if (diffH < 24) return fmt.format(-diffH, "hour");
  if (diffD < 30) return fmt.format(-diffD, "day");
  const diffM = Math.floor(diffD / 30);
  if (diffM < 12) return fmt.format(-diffM, "month");
  return fmt.format(-Math.floor(diffD / 365), "year");
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function OutcomeBadge({ won, draw }: { won: boolean; draw: boolean }): ReactElement {
  if (draw) {
    return (
      <span className="rounded-full border border-royal-surface-elevated bg-royal-surface-elevated px-2.5 py-0.5 text-xs font-medium text-royal-muted">
        Nulle
      </span>
    );
  }
  return won ? (
    <span className="rounded-full border border-emerald-500/30 bg-emerald-900/30 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
      Victoire
    </span>
  ) : (
    <span className="rounded-full border border-red-500/30 bg-red-900/30 px-2.5 py-0.5 text-xs font-medium text-red-400">
      Défaite
    </span>
  );
}

function EloDeltaBadge({ delta }: { delta: number | null }): ReactElement | null {
  if (delta === null) return null;
  const cls = delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-royal-muted";
  return (
    <span className={`font-mono text-sm font-medium ${cls}`}>
      {delta > 0 ? "+" : ""}
      {delta}
    </span>
  );
}

function GameHistoryCard({
  game,
  profileUserId,
}: {
  game: ProfileGameDto;
  profileUserId: string;
}): ReactElement {
  const isWhite = game.whitePlayer.id === profileUserId;
  const myColor = isWhite ? "white" : "black";
  const draw = game.winner === null && game.status === "completed";
  const won = game.winner === myColor;
  const myEloChange = isWhite ? game.whiteEloChange : game.blackEloChange;

  const opponent = isWhite ? game.blackPlayer : game.whitePlayer;

  return (
    <li className="flex items-center gap-4 rounded-xl border border-royal-surface-elevated bg-royal-surface/80 px-4 py-3 transition hover:border-royal-gold/40">
      {/* Couleur jouée */}
      <span
        className={`size-3 shrink-0 rounded-full border ${isWhite ? "border-white/50 bg-white" : "border-royal-surface-elevated bg-royal-surface"}`}
        title={isWhite ? "Blancs" : "Noirs"}
      />

      {/* Adversaire */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-royal-ivory">
          {opponent?.username ?? "—"}
        </p>
        <p className="text-xs text-royal-muted">
          {formatTimeControl(game.timeControl, game.initialTime, game.increment)}
          {" · "}
          {formatEndReason(game.endReason ?? undefined)}
          {" · "}
          {formatRelativeDate(game.endedAt)}
        </p>
      </div>

      {/* Badge résultat */}
      <OutcomeBadge won={won} draw={draw} />

      {/* Delta ELO */}
      <EloDeltaBadge delta={myEloChange ?? null} />

      {/* Lien analyse */}
      <Link
        href={`/analysis/${game.id}`}
        className="shrink-0 rounded-lg border border-royal-surface-elevated px-2.5 py-1 text-xs text-royal-muted transition hover:border-royal-gold/50 hover:text-royal-ivory"
      >
        Analyser
      </Link>
    </li>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function ProfilePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
}>): Promise<ReactElement> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { username: raw } = await params;
  const { page: pageRaw } = await searchParams;
  const username = decodeURIComponent(raw);
  const page = Math.max(1, Number(pageRaw ?? "1"));
  const limit = 20;

  const [profile, history] = await Promise.all([
    fetchPublicProfile(username),
    fetchGameHistory(username, page),
  ]);

  if (!profile) {
    notFound();
  }

  const sortedElo = [...profile.eloRatings].sort((a, b) => a.timeControl.localeCompare(b.timeControl));
  const { items } = history;
  const hasPrev = page > 1;
  const hasNext = items.length >= limit;

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-royal-ivory">Profil</h1>
        <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
      </div>

      <section className="rounded-xl border border-royal-surface-elevated bg-royal-surface/80 p-5">
        <h2 className="mb-3 font-medium text-royal-ivory">Statistiques</h2>
        <p className="text-sm text-royal-muted">
          Parties jouées : <span className="font-mono text-royal-ivory">{profile.stats.gamesPlayed}</span>
        </p>
      </section>

      <section className="rounded-xl border border-royal-surface-elevated bg-royal-surface/80 p-5">
        <h2 className="mb-4 font-medium text-royal-ivory">ELO par contrôle de temps</h2>
        <ul className="space-y-3">
          {sortedElo.map((row) => (
            <li key={row.timeControl} className="flex items-center justify-between text-sm">
              <span className="text-royal-muted">{TC_LABELS[row.timeControl] ?? row.timeControl}</span>
              <span className="font-mono text-royal-ivory">
                {row.rating}
                <span className="ml-2 text-xs text-royal-muted">({row.gamesPlayed} parties)</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-medium text-royal-ivory">Historique</h2>

        {items.length === 0 ? (
          <div className="rounded-xl border border-royal-surface-elevated bg-royal-surface/80 p-8 text-center">
            <EmptyChessBoard />
            <p className="mt-4 text-royal-muted">Aucune partie jouée. Lance ton premier défi !</p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center rounded-lg border border-royal-gold/40 bg-royal-surface px-4 py-2 text-sm font-medium text-royal-gold transition hover:border-royal-gold hover:bg-royal-surface-elevated"
            >
              Démarrer
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {items.map((game) => (
                <GameHistoryCard key={game.id} game={game} profileUserId={profile.id} />
              ))}
            </ul>

            {/* Pagination server-side */}
            <nav className="flex items-center justify-between pt-2" aria-label="Pagination historique">
              {hasPrev ? (
                <Link
                  href={`/profile/${encodeURIComponent(username)}?page=${page - 1}`}
                  className="rounded-lg border border-royal-surface-elevated px-4 py-2 text-sm text-royal-muted transition hover:border-royal-gold/50 hover:text-royal-ivory"
                >
                  ← Précédent
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-royal-surface-elevated px-4 py-2 text-sm text-royal-surface-elevated">
                  ← Précédent
                </span>
              )}

              <span className="text-xs text-royal-muted">Page {page}</span>

              {hasNext ? (
                <Link
                  href={`/profile/${encodeURIComponent(username)}?page=${page + 1}`}
                  className="rounded-lg border border-royal-surface-elevated px-4 py-2 text-sm text-royal-muted transition hover:border-royal-gold/50 hover:text-royal-ivory"
                >
                  Suivant →
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-royal-surface-elevated px-4 py-2 text-sm text-royal-surface-elevated">
                  Suivant →
                </span>
              )}
            </nav>
          </>
        )}
      </section>
    </div>
  );
}
