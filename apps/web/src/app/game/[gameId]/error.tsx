"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ReactElement } from "react";

export interface GameErrorProps {
  readonly error: Error & { digest?: string; code?: string };
  readonly reset: () => void;
}

function isNotParticipant(err: Error & { code?: string }): boolean {
  return err.code === "not_participant";
}

export function GameRouteError({ error, reset }: GameErrorProps): ReactElement {
  const title = isNotParticipant(error)
    ? "Vous n\u2019êtes pas participant de cette partie."
    : "Impossible de charger cette partie.";

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="font-display text-xl font-semibold text-royal-ivory md:text-2xl">{title}</h1>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" variant="royal" onClick={() => reset()}>
          Réessayer
        </Button>
        <Button type="button" variant="outline" className="border-royal-surface-elevated" asChild>
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </div>
  );
}

export default GameRouteError;
