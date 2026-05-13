import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GameNotFound(): React.ReactElement {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="font-display text-3xl font-semibold text-royal-ivory">Partie introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette partie n&apos;existe pas ou n&apos;est plus accessible. Elle a peut-être été supprimée
          ou le lien est invalide.
        </p>
      </div>
      <Button asChild variant="royal">
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </div>
  );
}
