import { Skeleton } from "@/components/ui/skeleton";
import type { ReactElement } from "react";

export function ProfileLoading(): ReactElement {
  return (
    <div className="mx-auto max-w-5xl space-y-10 py-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,280px)_1fr] lg:items-start">
        <aside className="space-y-4 rounded-2xl border border-royal-surface-elevated bg-royal-surface/80 p-6">
          <div className="mx-auto flex justify-center">
            <Skeleton className="size-28 rounded-full border border-royal-surface-elevated bg-royal-surface" />
          </div>
          <Skeleton className="mx-auto h-8 w-40 border border-royal-surface-elevated bg-royal-surface lg:mx-0" />
          <Skeleton className="mx-auto h-4 w-32 border border-royal-surface-elevated bg-royal-surface lg:mx-0" />
          <Skeleton className="mx-auto h-8 w-48 border border-royal-surface-elevated bg-royal-surface lg:mx-0" />
        </aside>
        <div className="min-w-0 space-y-10">
          <section className="space-y-4">
            <Skeleton className="h-7 w-56 border border-royal-surface-elevated bg-royal-surface" />
            <Skeleton className="h-64 w-full rounded-xl border border-royal-surface-elevated bg-royal-surface" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl border border-royal-surface-elevated bg-royal-surface" />
              ))}
            </div>
          </section>
          <section className="space-y-3">
            <Skeleton className="h-7 w-40 border border-royal-surface-elevated bg-royal-surface" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl border border-royal-surface-elevated bg-royal-surface" />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

export default ProfileLoading;
