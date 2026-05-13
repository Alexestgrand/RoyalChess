"use client";

import type { MatchmakingFoundPayload, MatchmakingQueuePreset } from "@royalchess/shared";
import { SocketEvent } from "@royalchess/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getMatchmakingSocket } from "@/lib/socket-client";
import { useMatchmakingStore } from "@/stores/matchmaking.store";

export type MatchmakingHookStatus = "idle" | "searching" | "found";

const ERROR_LABELS: Readonly<Record<string, string>> = {
  non_authentifie: "Vous devez être connecté pour jouer.",
  ws_blocked: "Trop de tentatives, réessayez plus tard.",
  ws_flood: "Trop de connexions, réessayez plus tard.",
  file_invalide: "Mode de jeu invalide.",
  session_jeu_active: "Vous avez déjà une partie en cours.",
};

function labelForError(code: string): string {
  return ERROR_LABELS[code] ?? "Connexion au matchmaking impossible.";
}

function isMatchmakingFoundPayload(value: unknown): value is MatchmakingFoundPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const o = value as Record<string, unknown>;
  const opp = o.opponent;
  if (!opp || typeof opp !== "object") {
    return false;
  }
  const op = opp as Record<string, unknown>;
  return (
    typeof o.gameId === "string" &&
    (o.myColor === "white" || o.myColor === "black") &&
    typeof op.username === "string" &&
    typeof op.elo === "number"
  );
}

export function formatMatchmakingWait(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export interface MatchmakingOpponentView {
  readonly username: string;
  readonly avatarUrl: string | null;
  readonly elo: number;
}

export interface UseMatchmakingResult {
  readonly status: MatchmakingHookStatus;
  readonly waitTime: number;
  readonly opponent: MatchmakingOpponentView | null;
  readonly activePreset: MatchmakingQueuePreset | null;
  readonly countdown: number | null;
  readonly errorMessage: string | null;
  joinQueue: (preset: MatchmakingQueuePreset) => void;
  cancelQueue: () => void;
}

export function useMatchmaking(): UseMatchmakingResult {
  const router = useRouter();
  const setPendingMatch = useMatchmakingStore((s) => s.setPendingMatch);

  const [status, setStatus] = useState<MatchmakingHookStatus>("idle");
  const [waitTime, setWaitTime] = useState(0);
  const [opponent, setOpponent] = useState<MatchmakingOpponentView | null>(null);
  const [activePreset, setActivePreset] = useState<MatchmakingQueuePreset | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlersRef = useRef<{ off: () => void } | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback((): void => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const detachSocketHandlers = useCallback((): void => {
    handlersRef.current?.off();
    handlersRef.current = null;
  }, []);

  const cancelQueue = useCallback((): void => {
    void getMatchmakingSocket()
      .then((s) => {
        s.emit(SocketEvent.CANCEL_QUEUE);
      })
      .catch(() => undefined);
    detachSocketHandlers();
    clearCountdown();
    setStatus("idle");
    setWaitTime(0);
    setOpponent(null);
    setActivePreset(null);
    setCountdown(null);
    setPendingMatch(null);
  }, [clearCountdown, detachSocketHandlers, setPendingMatch]);

  useEffect(() => () => {
    void getMatchmakingSocket()
      .then((s) => {
        s.emit(SocketEvent.CANCEL_QUEUE);
      })
      .catch(() => undefined);
    detachSocketHandlers();
    clearCountdown();
  }, [clearCountdown, detachSocketHandlers]);

  useEffect(() => {
    if (status !== "searching") {
      return;
    }
    const id = setInterval(() => {
      setWaitTime((w) => w + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  const joinQueue = useCallback(
    (preset: MatchmakingQueuePreset): void => {
      setErrorMessage(null);
      setOpponent(null);
      setCountdown(null);
      setPendingMatch(null);
      clearCountdown();

      void getMatchmakingSocket()
        .then((s) => {
          detachSocketHandlers();
          s.emit(SocketEvent.CANCEL_QUEUE);

          setActivePreset(preset);
          setStatus("searching");
          setWaitTime(0);

          const onFound = (payload: unknown): void => {
            if (!isMatchmakingFoundPayload(payload)) {
              return;
            }
            setPendingMatch(payload);
            setOpponent({
              username: payload.opponent.username,
              avatarUrl: payload.opponent.avatarUrl,
              elo: payload.opponent.elo,
            });
            setStatus("found");
            setCountdown(3);
            let remaining = 3;
            countdownRef.current = setInterval(() => {
              remaining -= 1;
              if (remaining <= 0) {
                clearCountdown();
                detachSocketHandlers();
                setStatus("idle");
                setActivePreset(null);
                setOpponent(null);
                setCountdown(null);
                setPendingMatch(null);
                router.push(`/game/${payload.gameId}`);
                return;
              }
              setCountdown(remaining);
            }, 1000);
          };

          const onConnError = (payload: unknown): void => {
            const p = (payload ?? {}) as { message?: unknown };
            const code = typeof p.message === "string" ? p.message : "erreur";
            detachSocketHandlers();
            clearCountdown();
            setStatus("idle");
            setActivePreset(null);
            setErrorMessage(labelForError(code));
          };

          const onIoConnectError = (err: { message?: string }): void => {
            detachSocketHandlers();
            clearCountdown();
            setStatus("idle");
            setActivePreset(null);
            setErrorMessage(labelForError(err?.message ?? "erreur"));
          };

          const onQueueTimeout = (): void => {
            detachSocketHandlers();
            clearCountdown();
            setStatus("idle");
            setActivePreset(null);
            setErrorMessage("Aucun adversaire trouvé dans le délai imparti. Réessayez.");
          };

          const onStatus = (payload: unknown): void => {
            const p = (payload ?? {}) as { waitingSeconds?: unknown };
            if (typeof p.waitingSeconds === "number" && Number.isFinite(p.waitingSeconds)) {
              const sec = Math.max(0, Math.floor(p.waitingSeconds));
              setWaitTime((w) => Math.max(w, sec));
            }
          };

          s.on(SocketEvent.MATCHMAKING_FOUND, onFound);
          s.on(SocketEvent.CONNECTION_ERROR, onConnError);
          s.on(SocketEvent.QUEUE_STATUS, onStatus);
          s.on(SocketEvent.QUEUE_TIMEOUT, onQueueTimeout);
          s.on("connect_error", onIoConnectError);

          handlersRef.current = {
            off: (): void => {
              s.off(SocketEvent.MATCHMAKING_FOUND, onFound);
              s.off(SocketEvent.CONNECTION_ERROR, onConnError);
              s.off(SocketEvent.QUEUE_STATUS, onStatus);
              s.off(SocketEvent.QUEUE_TIMEOUT, onQueueTimeout);
              s.off("connect_error", onIoConnectError);
            },
          };

          s.emit(SocketEvent.JOIN_QUEUE, {
            timeControl: preset.timeControl,
            initialTime: preset.initialTime,
            increment: preset.increment,
          });
        })
        .catch(() => {
          setStatus("idle");
          setActivePreset(null);
          setErrorMessage("Connexion au matchmaking impossible.");
        });
    },
    [clearCountdown, detachSocketHandlers, router, setPendingMatch],
  );

  return {
    status,
    waitTime,
    opponent,
    activePreset,
    countdown,
    errorMessage,
    joinQueue,
    cancelQueue,
  };
}