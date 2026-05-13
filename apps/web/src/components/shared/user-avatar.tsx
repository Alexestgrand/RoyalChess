import { cn } from "@/lib/utils";

export interface UserAvatarProps {
  readonly username: string;
  readonly src?: string | null;
  readonly className?: string;
}

export function UserAvatar({ username, src, className }: UserAvatarProps): React.ReactElement {
  const initial = username.charAt(0).toUpperCase();
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- URLs externes non configurées dans next.config
    return <img src={src} alt="" className={cn("rounded-full object-cover", className)} />;
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-royal-surface-elevated font-display text-lg font-semibold text-royal-gold ring-2 ring-royal-surface-elevated",
        className,
      )}
      aria-hidden
    >
      {initial}
    </div>
  );
}
