"use client";

import { useUiStore } from "@/stores/ui.store";
import { useEffect } from "react";

/** Applique `data-board-theme` et `data-analysis-arrow` sur `<html>` pour les variables CSS. */
export function HtmlUiDatasetSync(): null {
  const boardTheme = useUiStore((s) => s.boardTheme);
  const analysisArrowColor = useUiStore((s) => s.analysisArrowColor);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.dataset.boardTheme = boardTheme;
    document.documentElement.dataset.analysisArrow = analysisArrowColor;
  }, [boardTheme, analysisArrowColor]);

  return null;
}
