"use client";

import { Button } from "@/components/ui/button";
import {
  getPasswordStrengthTier,
  passwordStrengthBarClass,
  passwordStrengthBarWidth,
} from "@/lib/auth/password-strength";
import { parseRegisterConflictField } from "@/lib/auth/register-conflict";
import { registerFormSchema, type RegisterFormValues } from "@/lib/validators/auth-forms";
import { USERNAME_LIVE_REGEX } from "@/lib/username-live-regex";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { ReactElement } from "react";

type UsernameAvail = "idle" | "pending" | "available" | "taken" | "error" | "invalid_query";

export default function RegisterPage(): ReactElement {
  const router = useRouter();
  const [rootError, setRootError] = useState<string | null>(null);
  const [usernameAvail, setUsernameAvail] = useState<UsernameAvail>("idle");

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { username: "", email: "", password: "", confirm: "" },
  });

  const username = watch("username") ?? "";
  const pwd = watch("password") ?? "";
  const tier = useMemo(() => getPasswordStrengthTier(pwd), [pwd]);

  const checkUsernameFormat = useCallback((): boolean => {
    return USERNAME_LIVE_REGEX.test(username.trim());
  }, [username]);

  useEffect(() => {
    setRootError(null);
    if (!checkUsernameFormat()) {
      setUsernameAvail("idle");
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
  }, [username, checkUsernameFormat]);

  const usernameOk = checkUsernameFormat() && usernameAvail === "available";
  const submitEnabled = isValid && usernameOk && !isSubmitting;

  const onSubmit = async (data: RegisterFormValues): Promise<void> => {
    setRootError(null);
    clearErrors(["email", "username"]);
    const res = await fetch(`/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        username: data.username.trim(),
        password: data.password,
      }),
    });
    if (!res.ok) {
      if (res.status === 429) {
        setRootError(
          "Trop de tentatives. Patientez quelques minutes avant de recommencer.",
        );
        return;
      }
      if (res.status === 409) {
        let body: unknown;
        try {
          body = await res.json();
        } catch {
          body = null;
        }
        const field = parseRegisterConflictField(body);
        if (field === "email") {
          setError("email", { type: "server", message: "Cette adresse e-mail est déjà utilisée." });
          return;
        }
        if (field === "username") {
          setError("username", { type: "server", message: "Ce pseudo est déjà pris." });
          setUsernameAvail("taken");
          return;
        }
      }
      setRootError("Impossible de finaliser l'inscription. Réessayez.");
      return;
    }
    const sign = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (sign?.error) {
      const code = (sign as { code?: string }).code ?? sign.error;
      const throttled = typeof code === "string" && code.includes("RateLimited");
      setRootError(
        throttled
          ? "Compte créé. Connexion automatique temporairement limitée — réessayez depuis l'écran de connexion dans quelques minutes."
          : "Compte créé mais connexion automatique impossible.",
      );
      return;
    }
    router.replace("/");
    router.refresh();
  };

  const usernameHint = (): ReactElement | null => {
    if (!username.trim()) {
      return null;
    }
    if (!USERNAME_LIVE_REGEX.test(username.trim())) {
      return <p className="text-xs text-muted-foreground">3 à 20 caractères : lettres, chiffres, _ ou -</p>;
    }
    if (usernameAvail === "pending") {
      return <p className="text-xs text-muted-foreground">Vérification…</p>;
    }
    if (usernameAvail === "available") {
      return <p className="text-xs text-emerald-500">✓ Disponible</p>;
    }
    if (usernameAvail === "taken") {
      return <p className="text-xs text-red-500">✗ Déjà pris</p>;
    }
    if (usernameAvail === "error" || usernameAvail === "invalid_query") {
      return <p className="text-xs text-destructive">Vérification impossible, réessayez.</p>;
    }
    return null;
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold text-royal-ivory">Inscription</h1>
        <p className="mt-1 text-sm text-muted-foreground">Créez votre compte RoyalChess.</p>
      </div>
      {rootError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
          {rootError}
        </p>
      ) : null}
      <form
        className="space-y-4"
        method="post"
        action="/api/auth/form-fallback"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="space-y-1">
          <label className="text-sm font-medium text-royal-ivory" htmlFor="username">
            Pseudo
          </label>
          <input
            id="username"
            autoComplete="username"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            {...register("username")}
          />
          {errors.username ? <p className="text-xs text-destructive">{errors.username.message}</p> : null}
          {usernameHint()}
        </div>
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
          <label className="text-sm font-medium text-royal-ivory" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            {...register("password")}
          />
          {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all ${passwordStrengthBarClass(tier)}`}
              style={{ width: passwordStrengthBarWidth(tier) }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {tier === "weak" ? "Trop court (moins de 8 caractères)" : null}
            {tier === "medium" ? "Correct — un symbole renforcerait le mot de passe" : null}
            {tier === "strong" ? "Mot de passe robuste" : null}
          </p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-royal-ivory" htmlFor="confirm">
            Confirmation
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            {...register("confirm")}
          />
          {errors.confirm ? <p className="text-xs text-destructive">{errors.confirm.message}</p> : null}
        </div>
        <Button className="w-full" type="submit" variant="royal" disabled={!submitEnabled}>
          {isSubmitting ? "Création…" : "Créer mon compte"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link href="/login" className="text-royal-gold hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
