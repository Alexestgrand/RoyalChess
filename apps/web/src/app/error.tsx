"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ReactElement } from "react";

export interface GlobalErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export function GlobalError({ error, reset }: GlobalErrorProps): ReactElement {
  const showMessage = process.env.NODE_ENV !== "production";

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center gap-6 px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold text-royal-gold">Une erreur est survenue</h1>
      {showMessage ? (
        <p className="rounded-lg border border-royal-surface-elevated bg-royal-surface px-3 py-2 text-left text-sm text-royal-muted">
          {error.message}
        </p>
      ) : null}
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

export default GlobalError;
