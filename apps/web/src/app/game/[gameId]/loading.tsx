import { Skeleton } from "@/components/ui/skeleton";
import type { ReactElement } from "react";

function BoardSkeletonGrid(): ReactElement {
  return (
    <div className="grid aspect-square w-full max-w-[min(92vw,640px)] grid-cols-8 grid-rows-8 overflow-hidden rounded-lg border-2 border-royal-surface-elevated">
      {Array.from({ length: 64 }).map((_, i) => (
        <Skeleton key={i} className="size-full rounded-none border border-royal-surface-elevated/30 bg-royal-surface" />
      ))}
    </div>
  );
}

export function GameRoomLoading(): ReactElement {
  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-8 w-32 border border-royal-surface-elevated bg-royal-surface md:w-40" />
        <Skeleton className="h-4 w-40 border border-royal-surface-elevated bg-royal-surface" />
      </div>
      <div className="relative flex min-h-[calc(100dvh-5rem)] flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="relative flex flex-1 flex-col items-center justify-center gap-4">
          <BoardSkeletonGrid />
          <div className="flex w-full max-w-md justify-center gap-4">
            <Skeleton className="h-24 flex-1 rounded-xl border border-royal-surface-elevated bg-royal-surface" />
            <Skeleton className="h-24 flex-1 rounded-xl border border-royal-surface-elevated bg-royal-surface" />
          </div>
        </div>
        <div className="hidden w-full max-w-md shrink-0 space-y-3 lg:block">
          <Skeleton className="h-72 rounded-xl border border-royal-surface-elevated bg-royal-surface" />
        </div>
      </div>
    </div>
  );
}

export default GameRoomLoading;
