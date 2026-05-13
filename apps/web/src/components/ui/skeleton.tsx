import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactElement } from "react";

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-royal-surface-elevated/70", className)}
      {...props}
    />
  );
}

export { Skeleton };
