import { UseFilters } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import {
  gameChatContentSchema,
  gameSocketRoom,
  moveSchema,
  SocketEvent,
} from "@royalchess/shared";
import type { GameConnectionErrorPayload, MoveInput } from "@royalchess/shared";
import type { Server } from "socket.io";
import { Socket } from "socket.io";
import xss from "xss";
import { WsExceptionFilter } from "../common/filters/ws-exception.filter";
import { UsersRepository } from "../users/users.repository";
import { GameSessionRepository } from "./game-session.repository";
import { GameSessionService, type MoveHandleResult } from "./game-session.service";

function handshakeGameId(client: Socket): string | undefined {
  const raw = client.handshake.query as { gameId?: string | string[] };
  const gameId = Array.isArray(raw.gameId) ? raw.gameId[0] : raw.gameId;
  return typeof gameId === "string" && gameId.length > 0 ? gameId : undefined;
}

// Délai de grâce avant forfait sur déconnexion (ms). Défaut 60 s (prod comme dev).
// Pour des sessions longues pendant le dev (HMR), définir p.ex. `DISCONNECT_GRACE_MS=600000`.
function resolveDisconnectDeadlineMs(): number {
  const raw = process.env.DISCONNECT_GRACE_MS?.trim();
  if (raw && /^\d+$/.test(raw)) {
    const n = Number(raw);
    return Math.min(Math.max(n, 5_000), 3_600_000);
  }
  return 60_000;
}

const DISCONNECT_DEADLINE_MS = resolveDisconnectDeadlineMs();

@WebSocketGateway({ namespace: "/game" })
@UseFilters(new WsExceptionFilter())
export class GameSessionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly sessions: GameSessionService,
    private readonly repo: GameSessionRepository,
    private readonly users: UsersRepository,
  ) {}

  afterInit(server: Server): void {
    this.sessions.attachBroadcaster(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const userId = client.data.userId as string | undefined;
    const gameId = handshakeGameId(client);
    if (!userId || !gameId) {
      client.disconnect(true);
      return;
    }
    const admission = await this.sessions.getGameSocketAdmission(gameId, userId);
    if (!admission.ok) {
      const payload: GameConnectionErrorPayload = { code: admission.code, gameId };
      client.emit(SocketEvent.CONNECTION_ERROR, payload);
      client.disconnect(true);
      return;
    }
    const hadDeadline = (await this.repo.removeDisconnectDeadline(gameId, userId)) > 0;
    await this.repo.setUserPlayingGame(userId, gameId);
    client.data.gameId = gameId;
    const room = gameSocketRoom(gameId);
    await client.join(room);
    if (hadDeadline) {
      client.to(room).emit(SocketEvent.OPPONENT_RECONNECTED, { userId });
    }
    const state = await this.sessions.getSocketGameState(gameId);
    if (state) {
      client.emit(SocketEvent.GAME_STATE, state);
    }
    const sockets = await this.server.in(room).fetchSockets();
    if (sockets.length >= 2) {
      this.server.to(room).emit(SocketEvent.GAME_READY, { gameId });
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data.userId as string | undefined;
    const gameId = client.data.gameId as string | undefined;
    if (!userId || !gameId) {
      return;
    }
    await this.repo.clearUserPlayingGame(userId);
    const session = await this.repo.getSession(gameId);
    if (session?.status === "active") {
      const willForfeitAt = Date.now() + DISCONNECT_DEADLINE_MS;
      await this.repo.addDisconnectDeadline(gameId, userId, willForfeitAt);
      const room = gameSocketRoom(gameId);
      client.to(room).emit(SocketEvent.OPPONENT_DISCONNECTED, { userId, willForfeitAt });
    }
  }

  @SubscribeMessage(SocketEvent.MOVE)
  async onMove(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<void> {
    const gameId = client.data.gameId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!gameId || !userId) {
      return;
    }
    const participantOk = await this.sessions.verifyParticipant(gameId, userId);
    if (!participantOk) {
      client.disconnect(true);
      return;
    }
    const burst = await this.repo.tryConsumeMoveBurst(gameId, userId);
    if (burst === "deny") {
      client.emit(SocketEvent.MOVE_ERROR, { message: "trop_de_coups" });
      client.disconnect(true);
      return;
    }
    const parsed = moveSchema.safeParse(body);
    if (!parsed.success) {
      client.emit(SocketEvent.MOVE_ERROR, { message: "coup_invalide" });
      return;
    }
    const room = gameSocketRoom(gameId);
    const result = await this.sessions.handleMove(gameId, userId, parsed.data);
    if (!result.ok) {
      if (result.error === "coup_illegal") {
        const m = parsed.data;
        client.emit(SocketEvent.MOVE_REJECTED, {
          reason: "ILLEGAL_MOVE",
          attemptedMove: {
            from: m.from,
            to: m.to,
            ...(m.promotion !== undefined ? { promotion: m.promotion } : {}),
          },
        });
        return;
      }
      client.emit(SocketEvent.MOVE_ERROR, { message: result.error });
      return;
    }
    this.server.to(room).emit(SocketEvent.GAME_STATE, result.state);
    if (result.finished) {
      // `gameOverPayload` est défini par `persistFinishedGame` ; on ne
      // fallback sur `{ result }` que pour les chemins legacy ou en cas
      // de skip idempotent (auquel cas `finished` ne devrait pas être true).
      const payload = result.gameOverPayload ?? { result: result.result };
      this.server.to(room).emit(SocketEvent.GAME_OVER, payload);
    }
  }

  @SubscribeMessage(SocketEvent.CHAT_MESSAGE)
  async onChat(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<void> {
    const gameId = client.data.gameId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!gameId || !userId) {
      return;
    }
    const parsed = gameChatContentSchema.safeParse(body);
    if (!parsed.success) {
      client.emit(SocketEvent.CONNECTION_ERROR, { message: "chat_invalide" });
      return;
    }
    const allowed = await this.repo.tryReserveChatSlot(gameId, userId);
    if (!allowed) {
      client.emit(SocketEvent.CONNECTION_ERROR, { message: "chat_trop_rapide" });
      return;
    }
    const author = await this.users.findById(userId);
    const content = xss(parsed.data.content);
    const room = gameSocketRoom(gameId);
    this.server.to(room).emit(SocketEvent.CHAT_MESSAGE, {
      authorId: userId,
      authorUsername: author?.username ?? "",
      content,
      sentAt: Date.now(),
    });
  }

  @SubscribeMessage(SocketEvent.RESIGN)
  async onResign(@ConnectedSocket() client: Socket): Promise<void> {
    await this.emitActionResult(client, (gid, uid) => this.sessions.handleResign(gid, uid));
  }

  @SubscribeMessage(SocketEvent.OFFER_DRAW)
  async onOfferDraw(@ConnectedSocket() client: Socket): Promise<void> {
    await this.emitActionResult(client, (gid, uid) => this.sessions.handleDrawOffer(gid, uid));
  }

  @SubscribeMessage(SocketEvent.ACCEPT_DRAW)
  async onAcceptDraw(@ConnectedSocket() client: Socket): Promise<void> {
    await this.emitActionResult(client, (gid, uid) => this.sessions.handleDrawAccept(gid, uid));
  }

  @SubscribeMessage(SocketEvent.DECLINE_DRAW)
  async onDeclineDraw(@ConnectedSocket() client: Socket): Promise<void> {
    await this.emitActionResult(client, (gid, uid) => this.sessions.handleDrawDecline(gid, uid));
  }

  @SubscribeMessage(SocketEvent.SET_PREMOVE)
  async onSetPremove(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<void> {
    const gameId = client.data.gameId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!gameId || !userId) {
      return;
    }
    const r = await this.sessions.setPremove(gameId, userId, body);
    if (!r.ok) {
      client.emit(SocketEvent.CONNECTION_ERROR, { message: r.error });
    }
  }

  @SubscribeMessage(SocketEvent.CANCEL_PREMOVE)
  async onCancelPremove(@ConnectedSocket() client: Socket): Promise<void> {
    const gameId = client.data.gameId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!gameId || !userId) {
      return;
    }
    const r = await this.sessions.cancelPremove(gameId, userId);
    if (!r.ok) {
      client.emit(SocketEvent.CONNECTION_ERROR, { message: r.error });
    }
  }

  @SubscribeMessage(SocketEvent.MOVE_PIECE)
  async onLegacyMove(@ConnectedSocket() client: Socket, @MessageBody() payload: unknown): Promise<void> {
    const gameId =
      typeof payload === "object" && payload !== null && "gameId" in payload
        ? String((payload as { gameId: unknown }).gameId)
        : (client.data.gameId as string | undefined);
    const move =
      typeof payload === "object" && payload !== null && "move" in payload
        ? (payload as { move: unknown }).move
        : payload;
    if (!gameId) {
      return;
    }
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      return;
    }
    const parsed = moveSchema.safeParse(move);
    if (!parsed.success) {
      client.emit(SocketEvent.MOVE_ERROR, { message: "coup_invalide" });
      return;
    }
    const okParticipant = await this.sessions.verifyParticipant(gameId, userId);
    if (!okParticipant) {
      client.emit(SocketEvent.MOVE_ERROR, { message: "non_joueur" });
      return;
    }
    const room = gameSocketRoom(gameId);
    await client.join(room);
    const result = await this.sessions.handleMove(gameId, userId, parsed.data);
    if (!result.ok) {
      if (result.error === "coup_illegal") {
        const m: MoveInput = parsed.data;
        client.emit(SocketEvent.MOVE_REJECTED, {
          reason: "ILLEGAL_MOVE",
          attemptedMove: {
            from: m.from,
            to: m.to,
            ...(m.promotion !== undefined ? { promotion: m.promotion } : {}),
          },
        });
        return;
      }
      client.emit(SocketEvent.MOVE_ERROR, { message: result.error });
      return;
    }
    this.server.to(room).emit(SocketEvent.GAME_STATE, result.state);
    if (result.finished) {
      const payload = result.gameOverPayload ?? { result: result.result };
      this.server.to(room).emit(SocketEvent.GAME_OVER, payload);
    }
  }

  private async emitActionResult(
    client: Socket,
    fn: (gameId: string, userId: string) => Promise<MoveHandleResult>,
  ): Promise<void> {
    const gameId = client.data.gameId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!gameId || !userId) {
      return;
    }
    const result = await fn(gameId, userId);
    if (!result.ok) {
      client.emit(SocketEvent.CONNECTION_ERROR, { message: result.error });
      return;
    }
    const room = gameSocketRoom(gameId);
    this.server.to(room).emit(SocketEvent.GAME_STATE, result.state);
    if (result.finished) {
      const payload = result.gameOverPayload ?? { result: result.result };
      this.server.to(room).emit(SocketEvent.GAME_OVER, payload);
    }
  }
}
