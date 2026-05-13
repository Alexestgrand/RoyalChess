"use client";

import { useAuthStore } from "@/stores/auth.store";
import { signOut, useSession } from "next-auth/react";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import type { ReactElement } from "react";
import { toast } from "sonner";
import { toastMessages } from "@/lib/toast-messages";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function Navbar(): ReactElement {
  const { status, data: session } = useSession();
  const storeUser = useAuthStore((s) => s.user);

  const username = storeUser?.username ?? session?.user?.username ?? "";
  const email = session?.user?.email ?? "";
  const avatarUrl = storeUser?.avatarUrl ?? null;
  const profileHref = username ? `/profile/${encodeURIComponent(username)}` : "/";

  if (status === "authenticated" && storeUser) {
    return (
      <header className="flex items-center justify-between gap-4 border-b border-royal-surface-elevated pb-4">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-royal-ivory transition hover:text-royal-gold"
        >
          RoyalChess
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto gap-2 rounded-lg border border-transparent px-2 py-1.5 text-royal-muted hover:border-royal-surface-elevated hover:bg-royal-surface/80 hover:text-royal-ivory"
              aria-label="Menu compte"
            >
              <UserAvatar username={username || "?"} src={avatarUrl} className="size-8" />
              <span className="hidden max-w-[140px] truncate text-sm text-royal-ivory sm:inline">{username}</span>
              <ChevronDown className="hidden size-4 shrink-0 opacity-70 sm:inline" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate font-semibold text-royal-ivory">{username}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={profileHref} className="cursor-pointer gap-2">
                <User className="size-4" aria-hidden />
                Mon profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer gap-2">
                <Settings className="size-4" aria-hidden />
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              onSelect={() => {
                toast.info(toastMessages.logoutFarewell, { duration: 2000 });
                void signOut({ callbackUrl: "/" });
              }}
            >
              <LogOut className="size-4" aria-hidden />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-royal-surface-elevated pb-4">
      <Link href="/" className="font-display text-xl font-semibold tracking-tight text-royal-ivory transition hover:text-royal-gold">
        RoyalChess
      </Link>
      <nav className="flex gap-4 text-sm text-royal-muted">
        <Link className="transition hover:text-royal-gold" href="/login">
          Connexion
        </Link>
        <Link className="transition hover:text-royal-gold" href="/register">
          Inscription
        </Link>
      </nav>
    </header>
  );
}
