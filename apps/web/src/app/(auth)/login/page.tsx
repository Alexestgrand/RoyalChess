import { Suspense, type ReactElement } from "react";
import { LoginForm } from "./login-form";

function LoginFallback(): ReactElement {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold text-royal-ivory">Connexion</h1>
        <p className="mt-1 text-sm text-muted-foreground">Chargement…</p>
      </div>
    </div>
  );
}

export default function LoginPage(): ReactElement {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
