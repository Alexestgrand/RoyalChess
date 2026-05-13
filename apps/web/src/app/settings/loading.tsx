import { Skeleton } from "@/components/ui/skeleton";
import type { ReactElement } from "react";

function SettingsPanelSkeleton(): ReactElement {
  return (
    <div className="space-y-3 rounded-xl border border-royal-surface-elevated bg-royal-surface p-5">
      <Skeleton className="h-6 w-40 border border-royal-surface-elevated bg-royal-surface" />
      <Skeleton className="h-4 w-full border border-royal-surface-elevated bg-royal-surface" />
      <Skeleton className="h-10 w-full border border-royal-surface-elevated bg-royal-surface" />
      <Skeleton className="h-10 w-full border border-royal-surface-elevated bg-royal-surface" />
    </div>
  );
}

export function SettingsLoading(): ReactElement {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48 border border-royal-surface-elevated bg-royal-surface" />
        <Skeleton className="h-4 max-w-md border border-royal-surface-elevated bg-royal-surface" />
      </div>
      <Skeleton className="h-10 w-full max-w-lg border border-royal-surface-elevated bg-royal-surface" />
      <div className="grid gap-4 md:grid-cols-2">
        <SettingsPanelSkeleton />
        <SettingsPanelSkeleton />
        <SettingsPanelSkeleton />
        <SettingsPanelSkeleton />
      </div>
    </div>
  );
}

export default SettingsLoading;
