import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import type { ReactElement } from "react";

const TC_LABELS: Readonly<Record<string, string>> = {
  BULLET: "Bullet",
  BLITZ: "Blitz",
  RAPID: "Rapide",
  CLASSICAL: "Classique",
  CORRESPONDENCE: "Correspondance",
};

interface PublicProfileDto {
  readonly id: string;
  readonly username: string;
  readonly avatarUrl: string | null;
  readonly createdAt: string;
  readonly stats: { gamesPlayed: number };
  readonly eloRatings: { timeControl: string; rating: number; gamesPlayed: number }[];
}

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
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicProfileDto;
  } catch {
    return null;
  }
}

export default async function ProfilePage({
  params,
}: Readonly<{
  params: Promise<{ username: string }>;
}>): Promise<ReactElement> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const { username: raw } = await params;
  const username = decodeURIComponent(raw);
  const profile = await fetchPublicProfile(username);
  if (!profile) {
    notFound();
  }

  const sortedElo = [...profile.eloRatings].sort((a, b) => a.timeControl.localeCompare(b.timeControl));

  return (
    <div className="mx-auto max-w-lg space-y-8 py-4">
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
    </div>
  );
}
