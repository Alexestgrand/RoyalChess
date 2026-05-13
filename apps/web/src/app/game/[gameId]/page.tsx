import { notFound } from "next/navigation";
import { fetchPublicGameSnapshot } from "@/lib/server-game-fetch";
import { GameRoomClient } from "@/components/game/game-room-client";

const INVITE_CODE_RE = /^[A-Z0-9]{8}$/;

export default async function GamePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ gameId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>): Promise<React.ReactElement> {
  const { gameId } = await params;
  const sp = (await searchParams) ?? {};
  const rawInvite = sp.invite;
  const inviteRaw = Array.isArray(rawInvite) ? rawInvite[0] : rawInvite;
  // On valide le format côté serveur pour éviter de propager un input
  // sauvage (XSS / injection) côté client. Si invalide, on l'ignore.
  const inviteCode =
    typeof inviteRaw === "string" && INVITE_CODE_RE.test(inviteRaw.toUpperCase())
      ? inviteRaw.toUpperCase()
      : null;
  const result = await fetchPublicGameSnapshot(gameId);

  if (result.kind === "not_found") {
    notFound();
  }

  const initialSnapshot = result.kind === "ok" ? result.state : null;

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl font-semibold text-royal-ivory md:text-2xl">Partie</h1>
        <span className="truncate font-mono text-xs text-royal-muted">{gameId}</span>
      </div>
      <GameRoomClient gameId={gameId} initialSnapshot={initialSnapshot} inviteCode={inviteCode} />
    </div>
  );
}
