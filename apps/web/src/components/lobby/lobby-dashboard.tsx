import { ActiveGamesFeed } from "@/components/lobby/active-games-feed";
import { CreateGameDialog } from "@/components/lobby/create-game-dialog";
import { JoinPrivateGameCard } from "@/components/lobby/join-private-game-card";
import { LobbyOnlineStats } from "@/components/lobby/lobby-online-stats";
import { QuickPlayGrid } from "@/components/lobby/quick-play-grid";
import type { ReactElement } from "react";

export function LobbyDashboard(): ReactElement {
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_minmax(280px,360px)]">
      <section className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-royal-ivory md:text-4xl">Lobby</h1>
          <p className="mt-2 max-w-xl text-sm text-royal-muted">
            Choisissez un contrôle de temps et affrontez la communauté. Design premium, parties fluides, analyse Stockfish.
          </p>
          <div className="mt-3">
            <LobbyOnlineStats />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <CreateGameDialog />
          </div>
          <JoinPrivateGameCard />
        </div>
        <div>
          <h2 className="mb-4 font-display text-lg text-royal-gold">Partie rapide</h2>
          <QuickPlayGrid />
        </div>
      </section>
      <aside className="rounded-2xl border border-royal-surface-elevated bg-royal-surface/80 p-5 shadow-xl backdrop-blur">
        <h2 className="mb-4 font-display text-lg text-royal-ivory">Parties en cours</h2>
        <ActiveGamesFeed />
      </aside>
    </div>
  );
}
