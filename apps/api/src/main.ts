import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import session from "express-session";
import { AppModule } from "./app.module";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { RedisIoAdapter } from "./socket/redis-io.adapter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);
  app.useLogger(app.get(Logger));
  const config = app.get(ConfigService);
  const nodeEnv = config.get<string>("NODE_ENV") ?? "development";
  const logger = app.get(Logger);

  if (nodeEnv === "production" && process.env.BEHIND_TLS_PROXY !== "1") {
    logger.warn(
      "NODE_ENV=production sans BEHIND_TLS_PROXY=1 : assurez-vous que le TLS est terminé au reverse-proxy.",
    );
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cookieParser());

  const sessionSecret = config.getOrThrow<string>("JWT_ACCESS_SECRET");
  app.use(
    "/auth",
    session({
      secret: sessionSecret,
      name: "rc.oauth.sid",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: nodeEnv === "production",
        sameSite: "strict",
        path: "/auth",
      },
    }),
  );

  app.enableCors({
    origin: config.get<string>("CORS_ORIGIN") ?? true,
    credentials: true,
  });
  app.useGlobalInterceptors(new LoggingInterceptor());

  if (nodeEnv !== "production") {
    const swagger = new DocumentBuilder()
      .setTitle("RoyalChess API")
      .setDescription("REST et contrats temps réel")
      .setVersion("1.0")
      .addBearerAuth(
        { type: "http", scheme: "bearer", bearerFormat: "JWT", in: "header" },
        "access-token",
      )
      .build();
    const document = SwaggerModule.createDocument(app, swagger);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = config.get<number>("API_PORT") ?? 3001;
  await app.listen(port);
}

bootstrap().catch((err: unknown) => {
  process.stderr.write(`${String(err)}\n`);
  process.exit(1);
});
