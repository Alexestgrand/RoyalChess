import { ArgumentsHost, Catch, ExceptionFilter, Logger } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import { SocketEvent } from "@royalchess/shared";
import type { Socket } from "socket.io";

@Catch()
export class WsExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();
    const isProd = process.env.NODE_ENV === "production";
    const message =
      exception instanceof WsException
        ? (() => {
            const e = exception.getError();
            return typeof e === "string" ? e : "erreur";
          })()
        : "erreur_serveur";
    if (!(exception instanceof WsException)) {
      if (!isProd && exception instanceof Error) {
        this.log.warn(exception.stack ?? exception.message);
      }
    }
    this.safeEmit(client, message);
  }

  private safeEmit(client: Socket, message: string): void {
    try {
      client.emit(SocketEvent.CONNECTION_ERROR, { message });
    } catch (err) {
      this.log.warn(
        `WsExceptionFilter.safeEmit a échoué: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
