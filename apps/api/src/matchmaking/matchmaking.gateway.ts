import { forwardRef, Inject, Logger, UseFilters } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { TimeControl } from "@prisma/client";
import { SocketEvent } from "@royalchess/shared";
import type { Server } from "socket.io";
import { Socket } from "socket.io";
import { WsExceptionFilter } from "../common/filters/ws-exception.filter";
import { MatchmakingService } from "./matchmaking.service";

export interface MatchFoundEmit {
  readonly gameId: string;
  readonly socketWhite: string;
  readonly socketBlack: string;
  readonly payloadWhite: {
    readonly gameId: string;
    readonly myColor: "white" | "black";
    readonly opponent: {
      readonly id: string;
      readonly username: string;
      readonly avatarUrl: string | null;
      readonly elo: number;
    };
    readonly timeControl: string;
    readonly initialTime: number;
    readonly increment: number;
  };
  readonly payloadBlack: MatchFoundEmit["payloadWhite"];
}

@WebSocketGateway({ namespace: "/matchmaking" })
@UseFilters(new WsExceptionFilter())
export class MatchmakingGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly log = new Logger(MatchmakingGateway.name);
  private readonly queueTimers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(
    @Inject(forwardRef(() => MatchmakingService))
    private readonly matchmaking: MatchmakingService,
  ) {}

  emitMatchFound(payload: MatchFoundEmit): void {
    if (payload.socketWhite) {
      this.server.to(payload.socketWhite).emit(SocketEvent.MATCHMAKING_FOUND, payload.payloadWhite);
    }
    if (payload.socketBlack) {
      this.server.to(payload.socketBlack).emit(SocketEvent.MATCHMAKING_FOUND, payload.payloadBlack);
    }
  }

  emitToSocket(socketId: string, event: SocketEvent, data: unknown): void {
    if (!socketId) {
      return;
    }
    this.server.to(socketId).emit(event, data);
  }

  @SubscribeMessage(SocketEvent.JOIN_QUEUE)
  async onJoinQueue(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<void> {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      client.emit(SocketEvent.CONNECTION_ERROR, { message: "non_authentifie" });
      return;
    }
    const res = await this.matchmaking.joinQueue(userId, body, client.id);
    if (!res.ok) {
      client.emit(SocketEvent.CONNECTION_ERROR, { message: res.error });
      return;
    }
    client.data.mmTc = res.timeControl;
    client.data.mmIt = res.initialTime;
    client.data.mmInc = res.increment;
    this.startQueueStatus(client, userId, res.timeControl, res.initialTime, res.increment);
  }

  @SubscribeMessage(SocketEvent.CANCEL_QUEUE)
  async onCancel(@ConnectedSocket() client: Socket): Promise<void> {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      return;
    }
    this.clearQueueStatus(client.id);
    await this.matchmaking.cancelQueue(userId);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.clearQueueStatus(client.id);
    const userId = client.data.userId as string | undefined;
    if (userId) {
      await this.matchmaking.cancelQueue(userId);
    }
  }

  private startQueueStatus(
    client: Socket,
    userId: string,
    timeControl: TimeControl,
    initialTime: number,
    increment: number,
  ): void {
    this.clearQueueStatus(client.id);
    const timer = setInterval(() => {
      void this.emitQueueStatus(client, userId, timeControl, initialTime, increment);
    }, 3000);
    this.queueTimers.set(client.id, timer);
    void this.emitQueueStatus(client, userId, timeControl, initialTime, increment);
  }

  private clearQueueStatus(socketId: string): void {
    const t = this.queueTimers.get(socketId);
    if (t) {
      clearInterval(t);
      this.queueTimers.delete(socketId);
    }
  }

  private async emitQueueStatus(
    client: Socket,
    userId: string,
    timeControl: TimeControl,
    initialTime: number,
    increment: number,
  ): Promise<void> {
    try {
      const snap = await this.matchmaking.getQueueStatusSnapshot(userId, timeControl, initialTime, increment);
      if (!snap) {
        return;
      }
      client.emit(SocketEvent.QUEUE_STATUS, {
        position: snap.position,
        estimatedWaitSeconds: snap.estimatedWaitSeconds,
        waitingSeconds: snap.waitingSeconds,
      });
    } catch (e) {
      this.log.debug({ err: e }, "queue_status");
    }
  }
}
