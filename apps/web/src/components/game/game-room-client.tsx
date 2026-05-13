"use client";

import type { GameState, MoveInput } from "@royalchess/shared";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { toast } from "sonner";
import { GameOverModal } from "@/components/game/game-over-modal";

// Le board fait du drag-n-drop (`@dnd-kit`), joue des sons et dépend du
// WebSocket : aucun bénéfice à le pré-rendre côté serveur. Le SSR provoque
// par ailleurs un mismatch d'hydratation `aria-describedby` (compteur global
// `DndDescribedBy-N` de `@dnd-kit/core`). On désactive donc le SSR via
// `dynamic` + fallback skeleton.
const ChessBoard = dynamic(
  () => import("@/components/board/chess-board").then((m) => m.ChessBoard),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-square w-full max-w-[min(92vw,720px)] animate-pulse rounded-xl bg-royal-surface/40" />
    ),
  },
);
import { GamePanel } from "@/components/game/game-panel";
import { OpponentStatusBanner } from "@/components/game/opponent-status-banner";
import { GameOverBanner } from "@/components/game/game-over-banner";
import { useGameSocket } from "@/hooks/use-game-socket";
import { usePremove } from "@/hooks/use-premove";
import { useGameStore, type GameOverPayload } from "@/stores/game.store";
import { useUiStore } from "@/stores/ui.store";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toastMessages } from "@/lib/toast-messages";

export interface GameRoomClientProps {
  readonly gameId: string;
  readonly initialSnapshot: GameState | null;
  /**
   * Code d'invitation (8 caractères) issu de l'URL `?invite=<code>`.
   * Lorsqu'il est présent, on tente automatiquement un `GET /games/join/<code>`
   * AVANT d'ouvrir le socket WebSocket : sans ce step, le visiteur n'est pas
   * encore inscrit comme `blackPlayerId` côté serveur, `verifyParticipant`
   * échoue et le socket est déconnecté immédiatement — ce qui laisse le
   * client coincé sur "Connexion à la partie…" jusqu'à un refresh manuel.
   */
  readonly inviteCode: string | null;
}

export function GameRoomClient({
  gameId,
  initialSnapshot,
  inviteCode,
}: GameRoomClientProps): ReactElement {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const hydrated = useRef(false);
  const setGameState = useGameStore((s) => s.setGameState);
  const gameState = useGameStore((s) => s.gameState);
  const gameOver = useGameStore((s) => s.gameOver);
  const setGameOver = useGameStore((s) => s.setGameOver);
  // On garde une copie persistante du dernier payload `gameOver` reçu pour
  // pouvoir ré-ouvrir le modal de fin de partie après que l'utilisateur l'a
  // fermé (la bannière en bas du board propose un bouton "Revoir le résumé").
  const lastGameOverRef = useRef<GameOverPayload | null>(null);
  useEffect(() => {
    if (gameOver) {
      lastGameOverRef.current = gameOver;
    }
  }, [gameOver]);
  // Tant que l'auto-join n'a pas terminé (succès ou échec définitif), on
  // n'ouvre pas le socket : sinon `verifyParticipant` rejette la connexion
  // pour un utilisateur qui n'est pas encore enregistré comme joueur.
  const [joinReady, setJoinReady] = useState<boolean>(inviteCode === null);
  const [inviteShareUrl, setInviteShareUrl] = useState<string | null>(null);
  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = sessionStorage.getItem(`royalchess_invite_${gameId}`);
    setInviteShareUrl(typeof raw === "string" && raw.length > 0 ? raw : null);
  }, [gameId]);

  useEffect(() => {
    if (joinReady || inviteCode === null) {
      return;
    }
    if (sessionStatus !== "authenticated") {
      return;
    }
    const token = session?.accessToken;
    if (!token) {
      // Pas de token : on laisse `verifyParticipant` gérer (échec attendu).
      setJoinReady(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${apiBase}/games/join/${encodeURIComponent(inviteCode)}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        // Les cas attendus sont :
        //  - 200 : on vient d'être assigné en `blackPlayer` (ou symétrique).
        //  - 403 "impossible_rejoindre_sa_table" : on est l'hôte. Pas grave,
        //    on est déjà participant. On débloque le socket.
        //  - 403 "partie_non_disponible" / 404 : la partie n'est plus jointable
        //    (déjà active avec un autre invité, ou supprimée). Le socket
        //    sera refusé par le serveur, l'UI affichera l'overlay
        //    "Connexion à la partie…" — c'est attendu, on n'a plus de
        //    recours côté client. On laisse passer pour ne pas geler l'UI.
        void res;
      } catch {
        // Erreur réseau : on laisse passer (le socket tentera et la
        // reconnexion automatique de socket.io prendra le relais).
      } finally {
        if (!cancelled) {
          // On retire le `?invite=` de l'URL pour ne pas re-déclencher de
          // join en cas de remount (StrictMode dev, navigation arrière, etc).
          router.replace(`/game/${gameId}`, { scroll: false });
          setJoinReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase, gameId, inviteCode, joinReady, router, session?.accessToken, sessionStatus]);

  const { sendMove, sendPremove, cancelPremove, sendChatMessage, resign, offerDraw, acceptDraw, declineDraw } =
    useGameSocket(joinReady ? gameId : null);

  usePremove(gameId, sendMove, cancelPremove);

  useEffect(() => {
    if (hydrated.current) {
      return;
    }
    hydrated.current = true;
    if (initialSnapshot) {
      setGameState(initialSnapshot, session?.user?.id);
    }
  }, [initialSnapshot, session?.user?.id, setGameState]);

  const premovesEnabled = useUiStore((s) => s.premovesEnabled);

  useEffect(() => {
    if (premovesEnabled) {
      return;
    }
    useGameStore.getState().setPremove(null);
    cancelPremove();
  }, [premovesEnabled, cancelPremove]);

  const onQueuePremove = useCallback(
    (m: MoveInput): void => {
      useGameStore.getState().setPremove(m);
      sendPremove(m);
    },
    [sendPremove],
  );

  const onCancelPremove = useCallback((): void => {
    useGameStore.getState().setPremove(null);
    cancelPremove();
  }, [cancelPremove]);

  // L'overlay "En attente de l'adversaire" doit UNIQUEMENT s'afficher tant
  // que la session serveur est explicitement en `waiting` (partie privée
  // dont le 2e joueur n'a pas encore rejoint). Auparavant, on déclenchait
  // aussi l'overlay sur `active && moveCount === 0 && !lastMove`, ce qui
  // verrouillait le board au démarrage de toutes les parties (le coup
  // d'ouverture des blancs n'ayant pas encore été joué). Concrètement,
  // dès que la session bascule en `active` les deux joueurs sont attribués
  // et l'échiquier doit être interactif.
  const waiting = gameState?.status === "waiting";
  const connecting = !gameState;
  const isHostWaiting =
    waiting &&
    gameState &&
    session?.user?.id === gameState.whitePlayer.userId &&
    typeof inviteShareUrl === "string" &&
    inviteShareUrl.length > 0;

  const onCopyInvite = useCallback((): void => {
    if (!inviteShareUrl) {
      return;
    }
    void navigator.clipboard.writeText(inviteShareUrl).then(() => {
      toast.success(toastMessages.inviteLinkCopied, { duration: 2000 });
    });
  }, [inviteShareUrl]);
  // `gameState.status` reste sur `completed` / `abandoned` même après que
  // l'utilisateur a fermé le modal `GameOverModal` (le store `gameOver` lui
  // a été remis à null). On utilise donc le `status` du board comme source
  // de vérité pour afficher la bannière persistante.
  const isFinished =
    gameState?.status === "completed" || gameState?.status === "abandoned";

  const handleReopenSummary = useCallback((): void => {
    if (lastGameOverRef.current) {
      setGameOver(lastGameOverRef.current);
    }
  }, [setGameOver]);
  const handleNewGame = useCallback((): void => {
    router.push("/");
  }, [router]);
  const handleAnalyze = useCallback((): void => {
    router.push(`/analysis/${gameId}`);
  }, [gameId, router]);
  const handleRematch = useCallback((): void => {
    const go = lastGameOverRef.current;
    const tc = go?.timeControl;
    const initial = go?.initialTime;
    const inc = go?.increment;
    if (!tc || initial == null || inc == null) {
      router.push("/");
      return;
    }
    const sp = new URLSearchParams({
      tc,
      initial: String(initial),
      inc: String(inc),
      auto: "1",
    });
    router.push(`/?${sp.toString()}`);
  }, [router]);

  return (
    <div className="relative flex min-h-[calc(100dvh-5rem)] flex-col gap-4 lg:flex-row lg:items-stretch">
      <GameOverModal onNewGame={handleNewGame} onAnalyze={handleAnalyze} onRematch={handleRematch} />
      <div className="relative flex flex-1 flex-col items-center justify-center gap-3 lg:min-h-0">
        {connecting || waiting ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-xl bg-royal-bg/80 px-4 text-center backdrop-blur-sm">
            <p className="font-display text-lg text-royal-ivory">
              {connecting ? "Connexion à la partie…" : "En attente de l&apos;adversaire…"}
            </p>
            {isHostWaiting ? (
              <Button type="button" variant="royal" size="sm" onClick={onCopyInvite}>
                Copier le lien d&apos;invitation
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className="relative flex w-full max-w-[min(92vw,720px)] flex-1 flex-col items-center justify-center">
          <ChessBoard
            gameId={gameId}
            onMove={sendMove}
            onCancelPremove={onCancelPremove}
            onQueuePremove={premovesEnabled ? onQueuePremove : undefined}
          />
        </div>
        <OpponentStatusBanner />
        {isFinished ? (
          <GameOverBanner
            canReopen={lastGameOverRef.current !== null}
            onReopenSummary={handleReopenSummary}
            onNewGame={handleNewGame}
            onAnalyze={handleAnalyze}
          />
        ) : null}
      </div>

      <div className="hidden w-full max-w-md shrink-0 lg:block">
        <GamePanel
          gameId={gameId}
          sendChatMessage={sendChatMessage}
          resign={resign}
          offerDraw={offerDraw}
          acceptDraw={acceptDraw}
          declineDraw={declineDraw}
        />
      </div>

      <div className="lg:hidden">
        <Tabs defaultValue="moves" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="moves" className="flex-1">
              Coups
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex-1">
              Chat
            </TabsTrigger>
            <TabsTrigger value="info" className="flex-1">
              Infos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="moves">
            <GamePanel
              gameId={gameId}
              sendChatMessage={sendChatMessage}
              resign={resign}
              offerDraw={offerDraw}
              acceptDraw={acceptDraw}
              declineDraw={declineDraw}
              compactMovesOnly
            />
          </TabsContent>
          <TabsContent value="chat">
            <GamePanel
              gameId={gameId}
              sendChatMessage={sendChatMessage}
              resign={resign}
              offerDraw={offerDraw}
              acceptDraw={acceptDraw}
              declineDraw={declineDraw}
              compactChatOnly
            />
          </TabsContent>
          <TabsContent value="info">
            <GamePanel
              gameId={gameId}
              sendChatMessage={sendChatMessage}
              resign={resign}
              offerDraw={offerDraw}
              acceptDraw={acceptDraw}
              declineDraw={declineDraw}
              compactInfoOnly
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
