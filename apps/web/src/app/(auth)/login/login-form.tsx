"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { safeCallbackPath } from "@/lib/auth/safe-callback-url";
import { loginFormSchema, type LoginFormValues } from "@/lib/validators/auth-forms";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { toastMessages } from "@/lib/toast-messages";

const LOGIN_STORAGE_KEY = "royalchess_login_attempts_v1";
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

interface LoginLockState {
  readonly failures: number;
  readonly lockedUntil: number;
}

function readLockState(): LoginLockState {
  if (typeof window === "undefined") {
    return { failures: 0, lockedUntil: 0 };
  }
  try {
    const raw = window.sessionStorage.getItem(LOGIN_STORAGE_KEY);
    if (!raw) {
      return { failures: 0, lockedUntil: 0 };
    }
    return JSON.parse(raw) as LoginLockState;
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

function writeLockState(state: LoginLockState): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(LOGIN_STORAGE_KEY, JSON.stringify(state));
}

export function LoginForm(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const callbackParam = searchParams.get("callbackUrl");

  const [rootError, setRootError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [lockState, setLockState] = useState<LoginLockState>({ failures: 0, lockedUntil: 0 });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setLockState(readLockState());
  }, []);

  useEffect(() => {
    if (lockState.lockedUntil <= Date.now()) {
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [lockState.lockedUntil]);

  const locked = lockState.lockedUntil > now;
  const lockRemainingSec = locked ? Math.max(0, Math.ceil((lockState.lockedUntil - now) / 1000)) : 0;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = useCallback(
    async (data: LoginFormValues): Promise<void> => {
      setRootError(null);
      const current = readLockState();
      if (current.lockedUntil > Date.now()) {
        return;
      }
      const res = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (res?.error) {
        // Auth.js v5 expose le `code` de la sous-classe d'erreur dans
        // `res.code` (selon la version) et préfixe parfois `res.error`. On
        // teste les deux pour rester robuste aux mises à jour mineures.
        const code = (res as { code?: string }).code ?? res.error;
        const isThrottled = typeof code === "string" && code.includes("RateLimited");
        if (isThrottled) {
          setRootError(
            "Trop de tentatives de connexion. Patientez quelques minutes avant de réessayer.",
          );
          return;
        }
        const failures = current.failures + 1;
        const next: LoginLockState =
          failures >= MAX_FAILURES
            ? { failures: 0, lockedUntil: Date.now() + LOCK_MS }
            : { failures, lockedUntil: 0 };
        writeLockState(next);
        setLockState(next);
        setRootError("Email ou mot de passe incorrect");
        return;
      }
      writeLockState({ failures: 0, lockedUntil: 0 });
      setLockState({ failures: 0, lockedUntil: 0 });
      const s = await getSession();
      const displayName =
        (typeof s?.user?.username === "string" && s.user.username.length > 0 ? s.user.username : null) ??
        (typeof s?.user?.name === "string" && s.user.name.length > 0 ? s.user.name : null) ??
        (typeof s?.user?.email === "string" ? s.user.email.split("@")[0] : null) ??
        "joueur";
      toast.success(toastMessages.loginWelcome(displayName), { duration: 3000 });
      const target = safeCallbackPath(callbackParam, window.location.origin);
      router.replace(target);
      router.refresh();
    },
    [router, callbackParam],
  );

  const oauthMessage =
    oauthError === "SessionRequired"
      ? "Session requise"
      : oauthError === "NoJsFallback"
        ? "Le JavaScript ne s'est pas chargé. Rechargez la page."
        : oauthError
          ? "Erreur d'authentification"
          : null;

  const lockMessage = locked
    ? "Trop de tentatives. Réessayez dans 15 minutes."
    : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold text-royal-ivory">Connexion</h1>
        <p className="mt-1 text-sm text-muted-foreground">Accédez à votre compte RoyalChess.</p>
      </div>
      {(oauthMessage || rootError || lockMessage) && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
          {lockMessage ?? rootError ?? oauthMessage}
        </p>
      )}
      {locked ? (
        <p className="text-center text-xs text-muted-foreground">Déverrouillage dans {lockRemainingSec}s</p>
      ) : null}
      <form
        className="space-y-4"
        method="post"
        action="/api/auth/form-fallback"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="space-y-1">
          <label className="text-sm font-medium text-royal-ivory" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            {...register("email")}
          />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-medium text-royal-ivory" htmlFor="password">
              Mot de passe
            </label>
            <button
              type="button"
              className="text-xs text-royal-gold underline-offset-2 hover:underline"
              onClick={() => setForgotOpen(true)}
            >
              Mot de passe oublié ?
            </button>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            {...register("password")}
          />
          {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
        </div>
        <Button className="w-full" type="submit" variant="royal" disabled={isSubmitting || locked}>
          {isSubmitting ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
      <Button
        type="button"
        variant="outline"
        className="w-full border-royal-gold/40 text-royal-gold hover:bg-royal-gold/10"
        onClick={() => {
          const target = safeCallbackPath(callbackParam, window.location.origin);
          void signIn("google", { callbackUrl: target });
        }}
      >
        Continuer avec Google
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href="/register" className="text-royal-gold hover:underline">
          Créer un compte
        </Link>
      </p>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="border-royal-surface-elevated bg-royal-surface sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mot de passe oublié</DialogTitle>
            <DialogDescription>Fonctionnalité bientôt disponible.</DialogDescription>
          </DialogHeader>
          <Button type="button" variant="royal" className="w-full" onClick={() => setForgotOpen(false)}>
            Fermer
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
