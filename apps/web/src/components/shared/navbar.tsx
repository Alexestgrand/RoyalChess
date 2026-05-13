"use client";

import { useAuthStore } from "@/stores/auth.store";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ReactElement } from "react";

export function Navbar(): ReactElement {
  const { status } = useSession();
  const storeUser = useAuthStore((s) => s.user);

  const username = storeUser?.username ?? "";
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
        <nav className="flex items-center gap-3 text-sm text-royal-muted">
          <Link className="transition hover:text-royal-gold" href={profileHref}>
            Profil
            {username ? <span className="text-royal-ivory"> ({username})</span> : null}
          </Link>
          <Button type="button" variant="ghost" size="sm" className="text-royal-muted" onClick={() => void signOut({ callbackUrl: "/" })}>
            Déconnexion
          </Button>
        </nav>
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
