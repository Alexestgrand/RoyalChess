"use client";

import type { UserPreferences } from "@royalchess/shared";
import { AccountSettingsPanel } from "@/components/settings/account-settings-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";
import type { ReactElement } from "react";

const BOARD_THEMES: readonly { id: UserPreferences["boardTheme"]; label: string }[] = [
  { id: "royal-classic", label: "Royal classique" },
  { id: "forest-stone", label: "Forêt & pierre" },
  { id: "midnight-blue", label: "Minuit bleu" },
  { id: "slate-marble", label: "Ardoise marbrée" },
];

const PIECE_THEMES: readonly { id: UserPreferences["pieceTheme"]; label: string }[] = [
  { id: "classic", label: "Classique" },
  { id: "royal", label: "Royal" },
  { id: "neo", label: "Néo" },
];

const ARROW_COLORS: readonly { id: UserPreferences["analysisArrowColor"]; label: string }[] = [
  { id: "gold", label: "Or" },
  { id: "emerald", label: "Émeraude" },
  { id: "cyan", label: "Cyan" },
  { id: "violet", label: "Violet" },
];

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  id,
}: Readonly<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}>): ReactElement {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-royal-surface-elevated bg-royal-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-royal-ivory">{label}</p>
        {description ? <p className="mt-1 text-xs text-royal-muted">{description}</p> : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant={checked ? "royal" : "outline"}
        id={id}
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
      >
        {checked ? "Activé" : "Désactivé"}
      </Button>
    </div>
  );
}

export function SettingsPageClient(): ReactElement {
  const boardTheme = useUiStore((s) => s.boardTheme);
  const pieceTheme = useUiStore((s) => s.pieceTheme);
  const analysisArrowColor = useUiStore((s) => s.analysisArrowColor);
  const setBoardTheme = useUiStore((s) => s.setBoardTheme);
  const setPieceTheme = useUiStore((s) => s.setPieceTheme);
  const setAnalysisArrowColor = useUiStore((s) => s.setAnalysisArrowColor);
  const soundEnabled = useUiStore((s) => s.soundEnabled);
  const setSoundEnabled = useUiStore((s) => s.setSoundEnabled);
  const pieceAnimationsEnabled = useUiStore((s) => s.pieceAnimationsEnabled);
  const setPieceAnimationsEnabled = useUiStore((s) => s.setPieceAnimationsEnabled);
  const showLegalMoves = useUiStore((s) => s.showLegalMoves);
  const setShowLegalMoves = useUiStore((s) => s.setShowLegalMoves);
  const premovesEnabled = useUiStore((s) => s.premovesEnabled);
  const setPremovesEnabled = useUiStore((s) => s.setPremovesEnabled);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-royal-gold">Paramètres</h1>
        <p className="mt-1 text-sm text-royal-muted">Compte, apparence de l&apos;échiquier et options de partie.</p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="account">Compte</TabsTrigger>
          <TabsTrigger value="appearance">Apparence</TabsTrigger>
          <TabsTrigger value="game">Jeu</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <AccountSettingsPanel />
        </TabsContent>

        <TabsContent value="appearance" className="mt-6 space-y-8">
          <section className="space-y-3" aria-labelledby="settings-board-theme">
            <h2 id="settings-board-theme" className="font-display text-lg font-semibold text-royal-gold">
              Thème des cases
            </h2>
            <p className="text-xs text-royal-muted">
              Quatre presets via <code className="text-royal-ivory">data-board-theme</code> sur{" "}
              <code className="text-royal-ivory">&lt;html&gt;</code> : royal-classic, forest-stone, midnight-blue,
              slate-marble.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {BOARD_THEMES.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  variant={boardTheme === t.id ? "royal" : "outline"}
                  className={cn("justify-start text-left", boardTheme === t.id && "ring-2 ring-royal-gold/60")}
                  onClick={() => setBoardTheme(t.id)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="settings-piece-theme">
            <h2 id="settings-piece-theme" className="font-display text-lg font-semibold text-royal-gold">
              Jeu de pièces
            </h2>
            <p className="text-xs text-royal-muted">Dossiers sous public/pieces/ : classic, royal, neo.</p>
            <div className="flex flex-wrap gap-2">
              {PIECE_THEMES.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  variant={pieceTheme === t.id ? "royal" : "outline"}
                  onClick={() => setPieceTheme(t.id)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="settings-arrow">
            <h2 id="settings-arrow" className="font-display text-lg font-semibold text-royal-gold">
              Couleur accent analyse
            </h2>
            <div className="flex flex-wrap gap-2">
              {ARROW_COLORS.map((c) => (
                <Button
                  key={c.id}
                  type="button"
                  variant={analysisArrowColor === c.id ? "royal" : "outline"}
                  onClick={() => setAnalysisArrowColor(c.id)}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="game" className="mt-6 space-y-3">
          <ToggleRow
            id="toggle-sound"
            label="Sons de partie"
            description="Coups, captures, échec et fin de partie."
            checked={soundEnabled}
            onChange={setSoundEnabled}
          />
          <ToggleRow
            id="toggle-anim"
            label="Animations des pièces"
            checked={pieceAnimationsEnabled}
            onChange={setPieceAnimationsEnabled}
          />
          <ToggleRow
            id="toggle-legal"
            label="Afficher les coups légaux"
            checked={showLegalMoves}
            onChange={setShowLegalMoves}
          />
          <ToggleRow
            id="toggle-premove"
            label="Pré-coups"
            description="Autorise un coup préparé pendant le tour adverse."
            checked={premovesEnabled}
            onChange={setPremovesEnabled}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
