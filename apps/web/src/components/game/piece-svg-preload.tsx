"use client";

import { useEffect } from "react";
import { useUiStore } from "@/stores/ui.store";

const PIECE_FILES = ["P", "N", "B", "R", "Q", "K"] as const;

function pieceSetForPreload(pieceTheme: string, preferencesRehydrated: boolean): string {
  if (!preferencesRehydrated) {
    return "royal";
  }
  if (pieceTheme === "neo" || pieceTheme === "royal" || pieceTheme === "classic") {
    return pieceTheme;
  }
  return "royal";
}

/**
 * Précharge les 12 SVG du jeu de pièces actif (évite le coût réseau au 1er drag).
 * Sans préférences persistées encore réhydratées, on aligne sur « royal » (SSR sans cookie).
 */
export function PieceSvgPreload(): null {
  const pieceTheme = useUiStore((s) => s.pieceTheme);
  const preferencesRehydrated = useUiStore((s) => s.preferencesRehydrated);

  useEffect(() => {
    const set = pieceSetForPreload(pieceTheme, preferencesRehydrated);
    const links: HTMLLinkElement[] = [];
    for (const color of ["w", "b"] as const) {
      for (const file of PIECE_FILES) {
        const href = `/pieces/${set}/${color}${file}.svg`;
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = href;
        link.type = "image/svg+xml";
        document.head.appendChild(link);
        links.push(link);
      }
    }
    return () => {
      for (const link of links) {
        link.remove();
      }
    };
  }, [pieceTheme, preferencesRehydrated]);

  return null;
}
