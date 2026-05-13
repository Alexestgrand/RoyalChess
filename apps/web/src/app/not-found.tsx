import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ReactElement } from "react";

function DecorativeMiniBoard(): ReactElement {
  const cells: ReactElement[] = [];
  for (let r = 0; r < 4; r++) {
    for (let f = 0; f < 4; f++) {
      const isLight = (f + r) % 2 === 0;
      const x = f * 16;
      const y = r * 16;
      cells.push(
        <rect
          key={`${r}-${f}`}
          x={x}
          y={y}
          width={16}
          height={16}
          fill={isLight ? "#f0d9b5" : "#b58863"}
        />,
      );
    }
  }
  return (
    <svg viewBox="0 0 64 64" className="mx-auto size-28 opacity-90" aria-hidden>
      {cells}
      <circle cx="40" cy="24" r="7" fill="#1e1e2a" stroke="#8a8a9a" strokeWidth="1" />
    </svg>
  );
}

export function NotFoundPage(): ReactElement {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <p className="font-display text-7xl font-bold leading-none text-royal-gold/90 md:text-8xl">404</p>
      <div className="space-y-3">
        <h1 className="font-display text-2xl font-semibold text-royal-ivory">Cette case est vide</h1>
        <p className="text-sm text-royal-muted">La page demandée n&apos;existe pas ou a été déplacée.</p>
      </div>
      <DecorativeMiniBoard />
      <Button asChild variant="royal" size="lg">
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </div>
  );
}

export default NotFoundPage;
