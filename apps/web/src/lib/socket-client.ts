import { getSession } from "next-auth/react";
import { io, type Socket } from "socket.io-client";

const baseUrl = (): string => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const socketIoPath = "/socket.io";

const reconnectOpts = {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30_000,
} as const;

async function buildAuth(): Promise<{ token: string }> {
  const session = await getSession();
  return { token: session?.accessToken ?? "" };
}

let matchmakingSocket: Socket | null = null;

export async function getMatchmakingSocket(): Promise<Socket> {
  const auth = await buildAuth();
  if (!matchmakingSocket) {
    matchmakingSocket = io(`${baseUrl()}/matchmaking`, {
      path: socketIoPath,
      auth,
      transports: ["websocket"],
      ...reconnectOpts,
    });
    matchmakingSocket.on("reconnect_attempt", () => {
      void buildAuth().then((a) => {
        if (matchmakingSocket) {
          matchmakingSocket.auth = a;
        }
      });
    });
  } else {
    matchmakingSocket.auth = auth;
  }
  return matchmakingSocket;
}

let gameSocket: Socket | null = null;
let gameSocketBoundId: string | null = null;

export async function getGameSocket(gameId: string): Promise<Socket> {
  const auth = await buildAuth();
  if (gameSocket && gameSocketBoundId !== gameId) {
    gameSocket.removeAllListeners();
    gameSocket.disconnect();
    gameSocket = null;
    gameSocketBoundId = null;
  }
  if (!gameSocket) {
    gameSocket = io(`${baseUrl()}/game`, {
      path: socketIoPath,
      auth,
      query: { gameId },
      transports: ["websocket"],
      ...reconnectOpts,
    });
    gameSocketBoundId = gameId;
    gameSocket.on("reconnect_attempt", () => {
      void buildAuth().then((a) => {
        if (gameSocket) {
          gameSocket.auth = a;
        }
      });
    });
  } else {
    gameSocket.auth = auth;
  }
  return gameSocket;
}

export function disconnectGameSocket(): void {
  if (gameSocket) {
    gameSocket.removeAllListeners();
    gameSocket.disconnect();
    gameSocket = null;
    gameSocketBoundId = null;
  }
}
