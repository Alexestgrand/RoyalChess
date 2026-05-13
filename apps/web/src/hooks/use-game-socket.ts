"use client";

import type { ChatMessage, GameState, MoveInput, Square } from "@royalchess/shared";
import { SocketEvent } from "@royalchess/shared";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { gameOverPayloadSchema } from "@/lib/schemas/game-over-payload.schema";
import { moveRejectedPayloadSchema } from "@/lib/schemas/move-rejected-payload.schema";
import { disconnectGameSocket, getGameSocket } from "@/lib/socket-client";
import { TOAST_IDS, toastMessages } from "@/lib/toast-messages";
import { useGameStore } from "@/stores/game.store";
import { toast } from "sonner";

export interface UseGameSocketApi {
  readonly sendMove: (move: MoveInput) => void;
  readonly sendPremove: (move: MoveInput) => void;
  readonly cancelPremove: () => void;
  readonly sendChatMessage: (content: string) => void;
  readonly resign: () => void;
  readonly offerDraw: () => void;
  readonly acceptDraw: () => void;
  readonly declineDraw: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function useGameSocket(gameId: string | null): UseGameSocketApi {
  const { data: session } = useSession();
  const setGameState = useGameStore((s) => s.setGameState);
  const appendChatMessage = useGameStore((s) => s.appendChatMessage);
  const setMoveError = useGameStore((s) => s.setMoveError);
  const setGameOver = useGameStore((s) => s.setGameOver);
  const setPremove = useGameStore((s) => s.setPremove);
  const setGameReady = useGameStore((s) => s.setGameReady);
  const setOpponentDisconnected = useGameStore((s) => s.setOpponentDisconnected);
  const optimisticFen = useGameStore((s) => s.optimisticFen);
  const myIdRef = useRef<string | undefined>(undefined);
  myIdRef.current = session?.user?.id;

  useEffect(() => {
    if (!optimisticFen) {
      return undefined;
    }
    const id = window.setTimeout(() => {
      useGameStore.getState().clearOptimistic();
    }, 3000);
    return () => window.clearTimeout(id);
  }, [optimisticFen]);

  useEffect(() => {
    if (!gameId) {
      return;
    }
    let activeSocket: Socket | null = null;
    let cancelled = false;

    const onState = (payload: unknown): void => {
      setGameState(payload as GameState, myIdRef.current);
      setMoveError(null);
    };
    const onChat = (payload: unknown): void => {
      appendChatMessage(payload as ChatMessage);
    };
    const onOver = (payload: unknown): void => {
      const parsed = gameOverPayloadSchema.safeParse(payload);
      const p = parsed.success ? parsed.data : {};
      const myId = myIdRef.current;
      const gs = useGameStore.getState().gameState;
      const myColor: "w" | "b" | null =
        gs && myId
          ? gs.whitePlayer.userId === myId
            ? "w"
            : gs.blackPlayer.userId === myId
              ? "b"
              : null
          : null;
      const myDelta = myColor === "w" ? p.whiteEloChange : myColor === "b" ? p.blackEloChange : undefined;
      const myAfter = myColor === "w" ? p.whiteEloAfter : myColor === "b" ? p.blackEloAfter : undefined;
      const oppSide = myColor === "w" ? p.opponentInfo?.black : myColor === "b" ? p.opponentInfo?.white : undefined;
      setGameOver({
        result: p.result,
        reason: p.reason,
        eloDelta: typeof myDelta === "number" ? myDelta : undefined,
        newElo: typeof myAfter === "number" ? myAfter : undefined,
        opponent: oppSide ? { username: oppSide.username, avatarUrl: oppSide.avatarUrl } : undefined,
        timeControl: p.timeControl,
        initialTime: p.initialTime,
        increment: p.increment,
      });
    };
    const onMoveErr = (payload: unknown): void => {
      useGameStore.getState().clearOptimistic();
      const msg =
        isRecord(payload) && typeof payload.message === "string"
          ? payload.message
          : "coup_invalide";
      setMoveError(msg);
      setPremove(null);
    };
    const onMoveRejected = (payload: unknown): void => {
      const parsed = moveRejectedPayloadSchema.safeParse(payload);
      const reason = parsed.success ? parsed.data.reason : "ILLEGAL_MOVE";
      useGameStore.getState().clearOptimistic();
      if (parsed.success && parsed.data.attemptedMove) {
        const att = parsed.data.attemptedMove;
        useGameStore.getState().flashReject({
          from: att.from as Square,
          to: att.to as Square,
        });
      }
      setMoveError(`Coup refusé : ${reason}`);
      setPremove(null);
    };
    const onReady = (): void => {
      setGameReady(true);
    };
    const onOppDisc = (payload: unknown): void => {
      if (!isRecord(payload)) {
        return;
      }
      const userId = typeof payload.userId === "string" ? payload.userId : "";
      const willForfeitAt =
        typeof payload.willForfeitAt === "number" && Number.isFinite(payload.willForfeitAt)
          ? payload.willForfeitAt
          : Date.now() + 60_000;
      if (userId.length > 0) {
        setOpponentDisconnected({ userId, forfeitAt: willForfeitAt });
      }
    };
    const onOppReco = (): void => {
      setOpponentDisconnected(null);
    };

    const onDisconnect = (): void => {
      toast.error(toastMessages.socketOffline, { id: TOAST_IDS.socketOffline, duration: Infinity });
    };
    const onConnect = (): void => {
      toast.dismiss(TOAST_IDS.socketOffline);
    };

    void getGameSocket(gameId).then((s) => {
      if (cancelled) {
        return;
      }
      activeSocket = s;
      s.on("disconnect", onDisconnect);
      s.on("connect", onConnect);
      s.on(SocketEvent.GAME_STATE, onState);
      s.on(SocketEvent.CHAT_MESSAGE, onChat);
      s.on(SocketEvent.GAME_OVER, onOver);
      s.on(SocketEvent.MOVE_ERROR, onMoveErr);
      s.on(SocketEvent.MOVE_REJECTED, onMoveRejected);
      s.on(SocketEvent.GAME_READY, onReady);
      s.on(SocketEvent.OPPONENT_DISCONNECTED, onOppDisc);
      s.on(SocketEvent.OPPONENT_RECONNECTED, onOppReco);
    });

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.off("disconnect", onDisconnect);
        activeSocket.off("connect", onConnect);
        activeSocket.off(SocketEvent.GAME_STATE, onState);
        activeSocket.off(SocketEvent.CHAT_MESSAGE, onChat);
        activeSocket.off(SocketEvent.GAME_OVER, onOver);
        activeSocket.off(SocketEvent.MOVE_ERROR, onMoveErr);
        activeSocket.off(SocketEvent.MOVE_REJECTED, onMoveRejected);
        activeSocket.off(SocketEvent.GAME_READY, onReady);
        activeSocket.off(SocketEvent.OPPONENT_DISCONNECTED, onOppDisc);
        activeSocket.off(SocketEvent.OPPONENT_RECONNECTED, onOppReco);
      }
      disconnectGameSocket();
      useGameStore.getState().reset();
    };
  }, [
    appendChatMessage,
    gameId,
    setGameOver,
    setGameReady,
    setGameState,
    setMoveError,
    setOpponentDisconnected,
    setPremove,
  ]);

  const emitWhenReady = useCallback(
    (event: string, payload?: unknown) => {
      if (!gameId) {
        return;
      }
      void getGameSocket(gameId).then((s) => {
        if (payload === undefined) {
          s.emit(event);
        } else {
          s.emit(event, payload);
        }
      });
    },
    [gameId],
  );

  const sendMove = useCallback(
    (move: MoveInput) => {
      emitWhenReady(SocketEvent.MOVE, move);
    },
    [emitWhenReady],
  );

  const sendChatMessage = useCallback(
    (content: string) => {
      emitWhenReady(SocketEvent.CHAT_MESSAGE, { content });
    },
    [emitWhenReady],
  );

  const resign = useCallback(() => {
    emitWhenReady(SocketEvent.RESIGN);
  }, [emitWhenReady]);

  const offerDraw = useCallback(() => {
    emitWhenReady(SocketEvent.OFFER_DRAW);
  }, [emitWhenReady]);

  const acceptDraw = useCallback(() => {
    emitWhenReady(SocketEvent.ACCEPT_DRAW);
  }, [emitWhenReady]);

  const declineDraw = useCallback(() => {
    emitWhenReady(SocketEvent.DECLINE_DRAW);
  }, [emitWhenReady]);

  const sendPremove = useCallback(
    (move: MoveInput) => {
      emitWhenReady(SocketEvent.SET_PREMOVE, move);
    },
    [emitWhenReady],
  );

  const cancelPremove = useCallback(() => {
    emitWhenReady(SocketEvent.CANCEL_PREMOVE);
  }, [emitWhenReady]);

  return {
    sendMove,
    sendPremove,
    cancelPremove,
    sendChatMessage,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
  };
}
