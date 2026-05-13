"use client";

import { MATCHMAKING_QUEUE_PRESETS } from "@royalchess/shared";
import type { MatchmakingQueuePreset } from "@royalchess/shared";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CLASSICAL_PRESET = {
  timeControl: "CLASSICAL",
  initialTime: 1800,
  increment: 30,
} as const;

type PrivateLobbyPreset = MatchmakingQueuePreset | (typeof CLASSICAL_PRESET);

const PRIVATE_PRESETS: readonly PrivateLobbyPreset[] = [
  ...MATCHMAKING_QUEUE_PRESETS,
  CLASSICAL_PRESET,
];

function presetTitleFallback(p: MatchmakingQueuePreset): string {
  return `${p.timeControl} ${Math.floor(p.initialTime / 60)}+${p.increment}`;
}

function presetLabel(p: PrivateLobbyPreset): string {
  if (p.timeControl === "CLASSICAL") {
    return "Classique 30+30";
  }
  if (p.timeControl === "BULLET" && p.initialTime === 60 && p.increment === 0) {
    return "Bullet 1+0";
  }
  if (p.timeControl === "BLITZ" && p.initialTime === 180 && p.increment === 2) {
    return "Blitz 3+2";
  }
  if (p.timeControl === "BLITZ" && p.initialTime === 300 && p.increment === 0) {
    return "Blitz 5+0";
  }
  if (p.timeControl === "RAPID" && p.initialTime === 600 && p.increment === 0) {
    return "Rapide 10+0";
  }
  return presetTitleFallback(p);
}

function presetKey(p: PrivateLobbyPreset): string {
  return `${p.timeControl}-${p.initialTime}-${p.increment}`;
}

const DEFAULT_PRIVATE_PRESET: PrivateLobbyPreset =
  MATCHMAKING_QUEUE_PRESETS.find((p) => p.timeControl === "BLITZ" && p.initialTime === 180 && p.increment === 2) ??
  MATCHMAKING_QUEUE_PRESETS[0]!;

type PreferredColor = "random" | "white" | "black";

export function CreateGameDialog(): React.ReactElement {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<PrivateLobbyPreset>(DEFAULT_PRIVATE_PRESET);
  const [preferredColor, setPreferredColor] = useState<PreferredColor>("random");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const presetOptions = useMemo(() => PRIVATE_PRESETS, []);

  const createAndCopy = useCallback(async (): Promise<void> => {
    setErr(null);
    setToast(null);
    const token = session?.accessToken;
    if (!token) {
      setErr("Vous devez être connecté.");
      return;
    }
    const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
    setBusy(true);
    try {
      const res = await fetch(`${base}/games/private`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          timeControl: preset.timeControl,
          initialTime: preset.initialTime,
          increment: preset.increment,
          preferredColor,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        setErr(t.length > 0 ? t : `Erreur ${res.status}`);
        return;
      }
      const data = (await res.json()) as { inviteUrl?: unknown; gameId?: unknown };
      if (typeof data.inviteUrl !== "string" || typeof data.gameId !== "string") {
        setErr("Réponse serveur inattendue.");
        return;
      }
      setInviteUrl(data.inviteUrl);
      // Copie automatique du lien (best-effort : `navigator.clipboard` peut
      // échouer en l'absence de permission ; on ne bloque pas la suite).
      let copied = false;
      try {
        await navigator.clipboard.writeText(data.inviteUrl);
        copied = true;
      } catch {
        copied = false;
      }
      setToast(
        copied
          ? "Lien copié ! Redirection vers la partie…"
          : "Lien généré. Redirection vers la partie…",
      );
      // CRITIQUE : on redirige le créateur vers la page de jeu pour qu'il
      // ouvre immédiatement son socket /game. Sans cette navigation, le
      // créateur reste sur le lobby (aucun socket connecté à la room
      // `game:<id>`) et ne reçoit pas le broadcast GAME_STATE émis par le
      // serveur lorsque l'invité rejoint via `/games/join/:inviteCode`.
      // On laisse 1.2 s pour que l'utilisateur voie la confirmation, puis
      // on navigue.
      window.setTimeout(() => {
        setOpen(false);
        router.push(`/game/${data.gameId}`);
      }, 1200);
    } catch {
      setErr("Impossible de créer la partie.");
    } finally {
      setBusy(false);
    }
  }, [preferredColor, preset.increment, preset.initialTime, preset.timeControl, router, session?.accessToken]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="border-royal-gold/40 text-royal-ivory hover:bg-royal-surface-elevated"
        >
          Partie privée
        </Button>
      </DialogTrigger>
      <DialogContent className="border-royal-surface-elevated bg-royal-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partie privée</DialogTitle>
          <DialogDescription>
            Choisissez le contrôle de temps et votre couleur préférée. Le lien d&apos;invitation sera copié automatiquement après
            création.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label htmlFor="private-tc" className="text-xs font-medium text-royal-muted">
              Contrôle de temps
            </label>
            <select
              id="private-tc"
              value={presetKey(preset)}
              onChange={(e) => {
                const v = e.target.value;
                const next = presetOptions.find((p) => presetKey(p) === v);
                if (next) {
                  setPreset(next);
                }
              }}
              disabled={status !== "authenticated" || busy}
              className="w-full rounded-md border border-royal-surface-elevated bg-royal-bg px-3 py-2 text-sm text-royal-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-gold"
            >
              {presetOptions.map((p) => (
                <option key={presetKey(p)} value={presetKey(p)}>
                  {presetLabel(p)}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-royal-muted">Couleur</legend>
            <div className="flex flex-wrap gap-3 text-sm text-royal-ivory">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="pcolor"
                  checked={preferredColor === "random"}
                  onChange={() => setPreferredColor("random")}
                  disabled={busy}
                />
                Aléatoire
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="pcolor"
                  checked={preferredColor === "white"}
                  onChange={() => setPreferredColor("white")}
                  disabled={busy}
                />
                Blancs
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="pcolor"
                  checked={preferredColor === "black"}
                  onChange={() => setPreferredColor("black")}
                  disabled={busy}
                />
                Noirs
              </label>
            </div>
          </fieldset>
          {inviteUrl ? (
            <div className="rounded-md border border-royal-surface-elevated bg-royal-bg/60 p-3 font-mono text-xs break-all text-royal-muted">
              {inviteUrl}
            </div>
          ) : null}
          {err ? (
            <p role="alert" className="text-xs text-destructive-foreground">
              {err}
            </p>
          ) : null}
          {toast ? (
            <p role="status" className="text-sm font-medium text-royal-gold">
              {toast}
            </p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="royal"
            disabled={busy || status !== "authenticated"}
            onClick={() => void createAndCopy()}
          >
            {busy ? "Création…" : "Créer le lien"}
          </Button>
          {inviteUrl ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void navigator.clipboard.writeText(inviteUrl).then(() => {
                setToast("Lien copié !");
                window.setTimeout(() => setToast(null), 3500);
              })}
            >
              Copier à nouveau
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
