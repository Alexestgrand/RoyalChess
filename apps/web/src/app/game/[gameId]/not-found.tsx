import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ReactElement } from "react";

export function GameNotFound(): ReactElement {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <p className="font-display text-5xl font-bold text-royal-gold/80">404</p>
        <h1 className="mt-4 font-display text-2xl font-semibold text-royal-ivory">Partie introuvable</h1>
        <p className="mt-2 text-sm text-royal-muted">
          Cette partie n&apos;existe pas ou n&apos;est plus accessible. Elle a peut-être été supprimée ou le lien est
          invalide.
        </p>
      </div>
      <Button asChild variant="royal">
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </div>
  );
}

export default GameNotFound;
