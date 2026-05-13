import { Skeleton } from "@/components/ui/skeleton";
import type { ReactElement } from "react";

export function DashboardLoading(): ReactElement {
  return (
    <div className="mx-auto max-w-6xl space-y-10 py-6">
      <div className="grid gap-10 lg:grid-cols-[1fr_minmax(280px,360px)]">
        <section className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48 border border-royal-surface-elevated bg-royal-surface" />
            <Skeleton className="h-4 max-w-xl border border-royal-surface-elevated bg-royal-surface" />
            <Skeleton className="h-4 w-64 border border-royal-surface-elevated bg-royal-surface" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {["jouer", "prive", "bot"].map((k) => (
              <div
                key={k}
                className="flex flex-col gap-3 rounded-xl border border-royal-surface-elevated bg-royal-surface p-5"
              >
                <Skeleton className="h-6 w-3/4 border border-royal-surface-elevated bg-royal-surface" />
                <Skeleton className="h-4 w-full border border-royal-surface-elevated bg-royal-surface" />
                <Skeleton className="h-10 w-full border border-royal-surface-elevated bg-royal-surface" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-7 w-40 border border-royal-surface-elevated bg-royal-surface" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg border border-royal-surface-elevated bg-royal-surface" />
              ))}
            </div>
          </div>
        </section>
        <aside className="space-y-4 rounded-2xl border border-royal-surface-elevated bg-royal-surface/80 p-5">
          <Skeleton className="h-7 w-36 border border-royal-surface-elevated bg-royal-surface" />
          <Skeleton className="h-20 w-full border border-royal-surface-elevated bg-royal-surface" />
          <Skeleton className="h-32 w-full border border-royal-surface-elevated bg-royal-surface" />
          <Skeleton className="h-6 w-2/3 border border-royal-surface-elevated bg-royal-surface" />
        </aside>
      </div>
    </div>
  );
}

export default DashboardLoading;
