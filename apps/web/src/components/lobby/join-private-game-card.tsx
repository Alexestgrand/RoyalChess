"use client";

import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

export function JoinPrivateGameCard(): React.ReactElement {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const join = useCallback(async (): Promise<void> => {
    setErr(null);
    setOk(null);
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 8) {
      setErr("Saisissez un code à 8 caractères.");
      return;
    }
    const token = session?.accessToken;
    if (!token) {
      setErr("Vous devez être connecté.");
      return;
    }
    const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
    setBusy(true);
    try {
      const res = await fetch(`${base}/games/join/${encodeURIComponent(trimmed)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) {
        const t = await res.text();
        setErr(t.length > 0 ? t : `Erreur ${res.status}`);
        return;
      }
      const data = (await res.json()) as { gameId?: unknown };
      if (typeof data.gameId !== "string") {
        setErr("Réponse serveur inattendue.");
        return;
      }
      setOk("Partie rejointe, redirection…");
      router.push(`/game/${data.gameId}`);
    } catch {
      setErr("Impossible de rejoindre la partie.");
    } finally {
      setBusy(false);
    }
  }, [code, router, session?.accessToken]);

  return (
    <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]/80 p-5 shadow-[var(--shadow-card)] backdrop-blur transition-colors hover:border-[color:var(--border-default)]">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] text-[color:var(--gold)]">
          <KeyRound className="size-4" aria-hidden />
        </span>
        <div>
          <h3 className="font-display text-sm font-semibold text-royal-ivory">Rejoindre une partie</h3>
          <p className="text-xs text-royal-muted">Collez le code d&apos;invitation (8 caractères).</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          maxLength={12}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCD1234"
          aria-label="Code d'invitation"
          className="min-w-0 flex-1 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-base)] px-3 py-2 font-mono text-sm tracking-[0.2em] text-royal-ivory placeholder:text-[color:var(--text-disabled)] placeholder:tracking-normal transition-colors focus-visible:border-[color:var(--border-gold-bright)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold-glow-strong)] disabled:opacity-50"
          disabled={status !== "authenticated" || busy}
        />
        <Button
          type="button"
          variant="royal"
          disabled={busy || status !== "authenticated"}
          onClick={() => void join()}
        >
          {busy ? "Connexion…" : "Rejoindre"}
        </Button>
      </div>
      {err ? (
        <p role="alert" className="mt-2 text-xs text-destructive-foreground">
          {err}
        </p>
      ) : null}
      {ok ? <p className="mt-2 text-xs text-[color:var(--gold-bright)]">{ok}</p> : null}
    </div>
  );
}
