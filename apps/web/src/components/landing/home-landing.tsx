import Link from "next/link";
import type { ReactElement } from "react";

function AnimatedBoardBackdrop(): ReactElement {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-[0.12]"
      aria-hidden
    >
      <div className="grid size-full min-h-[320px] max-h-[70vh] grid-cols-8 grid-rows-8 gap-px p-8 motion-safe:animate-pulse md:min-h-[420px]">
        {Array.from({ length: 64 }).map((_, i) => {
          const f = i % 8;
          const r = Math.floor(i / 8);
          const light = (f + r) % 2 === 0;
          return (
            <div
              key={i}
              className={`rounded-sm ${light ? "bg-royal-board-light" : "bg-royal-board-dark"}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function HomeLanding(): ReactElement {
  return (
    <div className="relative flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center gap-10 py-12 text-center">
      <AnimatedBoardBackdrop />
      <div className="relative z-10 max-w-2xl space-y-6 px-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-royal-ivory md:text-5xl">
          RoyalChess
        </h1>
        <p className="text-lg text-royal-muted md:text-xl">
          Partie rapide, design soigné et communauté passionnée. Rejoignez les échiquiers en ligne.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/register"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-royal-gold px-8 py-2.5 font-medium text-royal-bg transition hover:bg-royal-gold/90"
          >
            Créer un compte
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-royal-gold/50 px-8 py-2.5 font-medium text-royal-gold transition hover:bg-royal-gold/10"
          >
            Connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
