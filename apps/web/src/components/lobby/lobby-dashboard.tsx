import { Sparkles } from "lucide-react";
import type { ReactElement } from "react";
import { ActiveGamesFeed } from "@/components/lobby/active-games-feed";
import { CreateGameDialog } from "@/components/lobby/create-game-dialog";
import { JoinPrivateGameCard } from "@/components/lobby/join-private-game-card";
import { LobbyOnlineStats } from "@/components/lobby/lobby-online-stats";
import { QuickPlayGrid } from "@/components/lobby/quick-play-grid";

export function LobbyDashboard(): ReactElement {
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_minmax(300px,380px)]">
      <section className="space-y-8">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-gold)] bg-[color:var(--bg-surface)]/80 px-3 py-1 text-[0.7rem] uppercase tracking-[0.18em] text-[color:var(--gold-bright)] backdrop-blur">
            <Sparkles className="size-3" aria-hidden />
            Lobby
          </div>
          <div>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-royal-ivory md:text-5xl">
              Choisissez votre <span className="text-[color:var(--gold-bright)]">cadence</span>.
            </h1>
            <p className="mt-3 max-w-xl text-base text-royal-muted">
              Affrontez la communauté en temps réel. Matchmaking ELO, parties classées, analyse Stockfish post-partie.
            </p>
          </div>
          <LobbyOnlineStats />
        </header>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold text-royal-ivory">Partie rapide</h2>
            <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-[color:var(--border-gold)] via-[color:var(--border-subtle)] to-transparent" />
          </div>
          <QuickPlayGrid />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold text-royal-ivory">Jouer entre amis</h2>
            <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-[color:var(--border-gold)] via-[color:var(--border-subtle)] to-transparent" />
          </div>
          <div className="flex flex-wrap gap-3">
            <CreateGameDialog />
          </div>
          <JoinPrivateGameCard />
        </div>
      </section>

      <aside className="relative overflow-hidden rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]/80 p-6 shadow-[var(--shadow-elevated)] backdrop-blur">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-[color:var(--gold-glow)] blur-3xl" />
        <div className="relative space-y-5">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold text-royal-ivory">En direct</h2>
            <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-[color:var(--border-gold)] via-[color:var(--border-subtle)] to-transparent" />
          </div>
          <ActiveGamesFeed />
        </div>
      </aside>
    </div>
  );
}
