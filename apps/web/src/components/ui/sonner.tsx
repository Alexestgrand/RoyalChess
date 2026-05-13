"use client";

import { Toaster as Sonner } from "sonner";
import type { ComponentProps, ReactElement } from "react";

type ToasterProps = ComponentProps<typeof Sonner>;

/** Toaster Sonner — app dark-first, pas de `next-themes` ici. */
function Toaster({ theme = "dark", ...props }: ToasterProps): ReactElement {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-royal-surface group-[.toaster]:text-royal-ivory group-[.toaster]:border-royal-surface-elevated group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-royal-muted",
          actionButton: "group-[.toast]:bg-royal-gold group-[.toast]:text-royal-bg",
          cancelButton: "group-[.toast]:bg-royal-surface-elevated group-[.toast]:text-royal-muted",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
