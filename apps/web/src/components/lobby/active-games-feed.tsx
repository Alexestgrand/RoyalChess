"use client";

function MiniBoardSkeleton(): React.ReactElement {
  return (
    <div className="grid size-20 grid-cols-8 grid-rows-8 overflow-hidden rounded border border-royal-surface-elevated">
      {Array.from({ length: 64 }).map((_, i) => {
        const f = i % 8;
        const r = Math.floor(i / 8);
        const light = (f + r) % 2 === 0;
        return <div key={i} className={light ? "bg-royal-board-light" : "bg-royal-board-dark"} />;
      })}
    </div>
  );
}

export function ActiveGamesFeed(): React.ReactElement {
  return (
    <div className="space-y-4">
      <p className="text-xs text-royal-muted">
        Flux temps réel des parties spectateur : branchement WebSocket lobby à venir. Aperçu visuel :
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2, 3].map((k) => (
          <div key={k} className="flex flex-col items-center gap-2 rounded-lg border border-royal-surface-elevated bg-royal-bg/50 p-3">
            <MiniBoardSkeleton />
            <span className="text-[10px] text-royal-muted">Partie #{k + 1}</span>
            <span className="h-1 w-full animate-pulse rounded-full bg-royal-gold/30" />
          </div>
        ))}
      </div>
    </div>
  );
}
