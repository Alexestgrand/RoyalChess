"use client";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { USERNAME_LIVE_REGEX } from "@/lib/username-live-regex";
import { useAuthStore } from "@/stores/auth.store";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { toastMessages } from "@/lib/toast-messages";
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent, type ReactElement } from "react";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

type UsernameAvail = "idle" | "pending" | "available" | "taken" | "error" | "invalid_query";

export function AccountSettingsPanel(): ReactElement {
  const { data: session, status, update } = useSession();
  const token = session?.accessToken;

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [usernameAvail, setUsernameAvail] = useState<UsernameAvail>("idle");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setUsername(session.user.username ?? "");
      setEmail(session.user.email ?? "");
    }
  }, [session?.user]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const checkUsernameFormat = useCallback((): boolean => {
    return USERNAME_LIVE_REGEX.test(username.trim());
  }, [username]);

  useEffect(() => {
    if (!checkUsernameFormat()) {
      setUsernameAvail("idle");
      return;
    }
    if (username.trim() === session?.user?.username) {
      setUsernameAvail("available");
      return;
    }
    setUsernameAvail("pending");
    const handle = window.setTimeout(() => {
      void (async (): Promise<void> => {
        try {
          const res = await fetch(
            `/api/users/check-username?username=${encodeURIComponent(username.trim())}`,
            { cache: "no-store" },
          );
          if (res.status === 400) {
            setUsernameAvail("invalid_query");
            return;
          }
          if (!res.ok) {
            setUsernameAvail("error");
            return;
          }
          const data = (await res.json()) as { available?: boolean };
          setUsernameAvail(data.available === true ? "available" : "taken");
        } catch {
          setUsernameAvail("error");
        }
      })();
    }, 500);
    return () => window.clearTimeout(handle);
  }, [username, checkUsernameFormat, session?.user?.username]);

  const onPickFile = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    setAvatarErr(null);
    setAvatarMsg(null);
    const f = e.target.files?.[0];
    setFile(f ?? null);
    e.target.value = "";
  }, []);

  const onSubmitProfile = useCallback(
    async (e: FormEvent): Promise<void> => {
      e.preventDefault();
      setProfileErr(null);
      setProfileMsg(null);
      if (!token) {
        setProfileErr("Session expirée. Reconnectez-vous.");
        return;
      }
      if (!checkUsernameFormat()) {
        setProfileErr("Pseudo invalide.");
        return;
      }
      if (username.trim() !== session?.user?.username && usernameAvail !== "available") {
        setProfileErr("Pseudo non disponible.");
        return;
      }
      const body: { username?: string; email?: string } = {};
      if (username.trim() !== session?.user?.username) {
        body.username = username.trim();
      }
      if (email.trim() !== session?.user?.email) {
        body.email = email.trim();
      }
      if (Object.keys(body).length === 0) {
        setProfileMsg("Aucun changement.");
        return;
      }
      const res = await fetch(`${apiBase()}/users/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        if (res.status === 409) {
          setProfileErr("Pseudo ou email déjà utilisé.");
          return;
        }
        setProfileErr("Enregistrement impossible.");
        return;
      }
      const data = (await res.json()) as { username: string; email: string; avatarUrl: string | null };
      setProfileMsg("Profil mis à jour.");
      toast.success(toastMessages.profileUpdated, { duration: 3000 });
      await update({
        picture: data.avatarUrl ?? undefined,
        username: data.username,
        email: data.email,
      });
    },
    [token, username, email, session, checkUsernameFormat, usernameAvail, update],
  );

  const onSubmitPassword = useCallback(
    async (e: FormEvent): Promise<void> => {
      e.preventDefault();
      setPwdErr(null);
      setPwdMsg(null);
      if (!token) {
        setPwdErr("Session expirée. Reconnectez-vous.");
        return;
      }
      const res = await fetch(`${apiBase()}/users/me/password`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.status === 403) {
        setPwdErr("Compte OAuth : pas de mot de passe local à modifier.");
        return;
      }
      if (res.status === 401) {
        setPwdErr("Mot de passe actuel incorrect.");
        return;
      }
      if (!res.ok) {
        setPwdErr("Impossible de mettre à jour le mot de passe.");
        return;
      }
      setPwdMsg("Mot de passe mis à jour. Reconnectez-vous sur vos autres appareils.");
      toast.success(toastMessages.passwordUpdated, { duration: 3000 });
      setCurrentPassword("");
      setNewPassword("");
    },
    [token, currentPassword, newPassword],
  );

  const onSubmitAvatar = useCallback(async (): Promise<void> => {
    setAvatarErr(null);
    setAvatarMsg(null);
    if (!token || !file) {
      setAvatarErr("Choisissez une image.");
      return;
    }
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${apiBase()}/users/me/avatar`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        setAvatarErr("Envoi refusé (format ou taille).");
        return;
      }
      const data = (await res.json()) as {
        id: string;
        avatarUrl: string | null;
        username: string;
        email: string;
      };
      setAvatarMsg("Avatar mis à jour.");
      toast.success(toastMessages.avatarUpdated, { duration: 3000 });
      setFile(null);
      // Source de vérité pour la navbar : on pousse immédiatement dans le store
      // Zustand sans attendre que NextAuth propage `update()` via useSession,
      // pour éviter le flash "ancien avatar" (le sync session→store rejouera
      // la même valeur ensuite, ce qui est idempotent).
      const current = useAuthStore.getState().user;
      useAuthStore.setState({
        user: {
          id: current?.id ?? data.id,
          email: data.email,
          username: data.username,
          avatarUrl: data.avatarUrl,
        },
      });
      await update({
        picture: data.avatarUrl ?? undefined,
        username: data.username,
        email: data.email,
      });
    } finally {
      setAvatarBusy(false);
    }
  }, [token, file, update]);

  if (status === "loading") {
    return <p className="text-sm text-royal-muted">Chargement…</p>;
  }
  if (status !== "authenticated" || !session?.user) {
    return <p className="text-sm text-royal-muted">Connectez-vous pour gérer votre compte.</p>;
  }

  const usernameOk =
    checkUsernameFormat() &&
    (username.trim() === session.user.username || usernameAvail === "available");

  return (
    <div className="mx-auto max-w-lg space-y-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-royal-ivory">Paramètres</h1>
        <p className="mt-1 text-sm text-muted-foreground">Compte</p>
      </div>

      <section className="space-y-4 rounded-xl border border-royal-surface-elevated bg-royal-surface/80 p-5">
        <h2 className="font-medium text-royal-ivory">Avatar</h2>
        <div className="flex flex-wrap items-center gap-4">
          <UserAvatar
            username={session.user.username}
            src={previewUrl ?? session.user.image ?? null}
            className="size-20 border border-royal-surface-elevated"
          />
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="text-sm text-royal-muted file:mr-2 file:rounded-md file:border file:border-royal-surface-elevated file:bg-royal-surface file:px-2 file:py-1 file:text-xs file:text-royal-ivory"
              onChange={onPickFile}
            />
            <Button type="button" variant="royal" size="sm" disabled={!file || avatarBusy} onClick={() => void onSubmitAvatar()}>
              {avatarBusy ? "Envoi…" : "Enregistrer l’avatar"}
            </Button>
          </div>
        </div>
        {avatarMsg ? <p className="text-sm text-emerald-400">{avatarMsg}</p> : null}
        {avatarErr ? <p className="text-sm text-red-400">{avatarErr}</p> : null}
        <p className="text-xs text-royal-muted">JPEG, PNG, WebP ou GIF — max 2 Mo. Recadrage 256×256 en WebP.</p>
      </section>

      <section className="space-y-4 rounded-xl border border-royal-surface-elevated bg-royal-surface/80 p-5">
        <h2 className="font-medium text-royal-ivory">Pseudo et email</h2>
        <form className="space-y-3" onSubmit={(e) => void onSubmitProfile(e)}>
          <div>
            <label htmlFor="settings-username" className="text-xs text-royal-muted">
              Pseudo
            </label>
            <input
              id="settings-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-md border border-royal-surface-elevated bg-royal-bg px-3 py-2 text-sm text-royal-ivory"
              autoComplete="username"
            />
            {usernameAvail === "taken" ? (
              <p className="mt-1 text-xs text-red-400">Pseudo déjà pris.</p>
            ) : null}
            {usernameAvail === "pending" ? <p className="mt-1 text-xs text-royal-muted">Vérification…</p> : null}
          </div>
          <div>
            <label htmlFor="settings-email" className="text-xs text-royal-muted">
              Email
            </label>
            <input
              id="settings-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-royal-surface-elevated bg-royal-bg px-3 py-2 text-sm text-royal-ivory"
              autoComplete="email"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={!usernameOk}>
            Enregistrer
          </Button>
        </form>
        {profileMsg ? <p className="text-sm text-emerald-400">{profileMsg}</p> : null}
        {profileErr ? <p className="text-sm text-red-400">{profileErr}</p> : null}
      </section>

      <section className="space-y-4 rounded-xl border border-royal-surface-elevated bg-royal-surface/80 p-5">
        <h2 className="font-medium text-royal-ivory">Mot de passe</h2>
        <form className="space-y-3" onSubmit={(e) => void onSubmitPassword(e)}>
          <div>
            <label htmlFor="settings-cpwd" className="text-xs text-royal-muted">
              Mot de passe actuel
            </label>
            <input
              id="settings-cpwd"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-royal-surface-elevated bg-royal-bg px-3 py-2 text-sm text-royal-ivory"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label htmlFor="settings-npwd" className="text-xs text-royal-muted">
              Nouveau mot de passe
            </label>
            <input
              id="settings-npwd"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-royal-surface-elevated bg-royal-bg px-3 py-2 text-sm text-royal-ivory"
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-royal-muted">8+ caractères, majuscule, minuscule et chiffre.</p>
          </div>
          <Button type="submit" variant="outline">
            Mettre à jour le mot de passe
          </Button>
        </form>
        {pwdMsg ? <p className="text-sm text-emerald-400">{pwdMsg}</p> : null}
        {pwdErr ? <p className="text-sm text-red-400">{pwdErr}</p> : null}
      </section>
    </div>
  );
}
