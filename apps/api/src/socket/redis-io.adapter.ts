import type { INestApplicationContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient, type RedisClientType } from "redis";
import type Redis from "ioredis";
import type { ExtendedError, Server, ServerOptions, Socket } from "socket.io";
import { REDIS } from "../redis/redis.module";

function parseSocketOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function clientIp(socket: { handshake: { headers: Record<string, string | string[] | undefined>; address?: string } }): string {
  const xf = socket.handshake.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) {
    return xf.split(",")[0]?.trim() ?? "unknown";
  }
  return socket.handshake.address ?? "unknown";
}

export class RedisIoAdapter extends IoAdapter {
  private readonly nest: INestApplicationContext;
  private pubClient?: RedisClientType;
  private subClient?: RedisClientType;

  constructor(app: INestApplicationContext) {
    super(app);
    this.nest = app;
  }

  async connectToRedis(): Promise<void> {
    const config = this.nest.get(ConfigService);
    const url = config.getOrThrow<string>("REDIS_URL");
    this.pubClient = createClient({ url });
    this.subClient = this.pubClient.duplicate();
    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const config = this.nest.get(ConfigService);
    const jwt = this.nest.get(JwtService);
    const redisIoredis = this.nest.get<Redis>(REDIS);
    const secret = config.getOrThrow<string>("JWT_ACCESS_SECRET");
    const isProd = config.get<string>("NODE_ENV") === "production";
    const origins = parseSocketOrigins(config.getOrThrow<string>("CORS_ORIGIN"));

    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: origins, credentials: true },
      transports: isProd ? ["websocket"] : ["websocket", "polling"],
      pingTimeout: 10_000,
      pingInterval: 25_000,
    }) as Server;

    const middleware = this.buildAuthMiddleware(redisIoredis, jwt, secret);
    server.use(middleware);
    server.of(/^\/.*$/).use(middleware);

    if (this.pubClient && this.subClient) {
      server.adapter(createAdapter(this.pubClient, this.subClient));
    }

    const redisIo = redisIoredis;
    server.engine.on("connection", (rawSocket) => {
      void redisIo.incr("stats:ws:connections").catch(() => undefined);
      rawSocket.on("close", () => {
        void redisIo.decr("stats:ws:connections").catch(() => undefined);
      });
    });

    return server;
  }

  private buildAuthMiddleware(
    redis: Redis,
    jwt: JwtService,
    secret: string,
  ): (socket: Socket, next: (err?: ExtendedError) => void) => Promise<void> {
    return async (socket, next) => {
      try {
        if (typeof socket.data?.userId === "string" && socket.data.userId.length > 0) {
          next();
          return;
        }
        const ip = clientIp(socket);
        const blocked = await redis.get(`ws:bl:${ip}`);
        if (blocked) {
          next(new Error("ws_blocked"));
          return;
        }
        const minuteBucket = Math.floor(Date.now() / 60_000);
        const floodKey = `ws:conn:${ip}:${minuteBucket}`;
        const count = await redis.incr(floodKey);
        if (count === 1) {
          await redis.expire(floodKey, 120);
        }
        if (count > 500) {
          await redis.set(`ws:bl:${ip}`, "1", "EX", 600);
          await redis.decr(floodKey);
          next(new Error("ws_flood"));
          return;
        }

        const auth = socket.handshake.auth as { token?: unknown };
        let token = typeof auth?.token === "string" ? auth.token : "";
        if (!token) {
          const h = socket.handshake.headers.authorization;
          if (typeof h === "string" && h.startsWith("Bearer ")) {
            token = h.slice("Bearer ".length);
          }
        }
        if (!token) {
          next(new Error("non_authentifie"));
          return;
        }
        const payload = jwt.verify<{ sub: string }>(token, { secret });
        if (!socket.data) {
          (socket as { data: Record<string, unknown> }).data = {};
        }
        socket.data.userId = payload.sub;
        next();
      } catch {
        next(new Error("non_authentifie"));
      }
    };
  }
}
