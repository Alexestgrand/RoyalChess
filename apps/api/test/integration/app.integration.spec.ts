import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { GameSessionService } from "../../src/game-session/game-session.service";
import { PrismaService } from "../../src/prisma/prisma.service";
import { createIntegrationApp } from "./bootstrap-app";

const run = process.env.INTEGRATION_TEST === "1" && Boolean(process.env.DATABASE_URL) && Boolean(process.env.REDIS_URL);
const d = run ? describe : describe.skip;

function strongPassword(suffix: string): string {
  return `Aa1!${suffix}pass`;
}

d("API (intégration HTTP + session)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createIntegrationApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("flux auth : register → login → route protégée → refresh → logout ; email dupliqué refusé", async () => {
    const bridge = process.env.INTERNAL_AUTH_BRIDGE_SECRET ?? "";
    const suffix = `${Date.now()}`;
    const email = `u${suffix}@test.local`;
    const password = strongPassword(suffix);
    const agent = request.agent(app.getHttpServer());

    const reg = await agent
      .post("/auth/register")
      .set("x-internal-bridge", bridge)
      .send({ email, username: `usr_${suffix}`, password })
      .expect(201);

    expect(reg.body.accessToken).toBeDefined();
    expect(reg.body.refreshToken).toBeDefined();

    await agent.get("/auth/me").set("Authorization", `Bearer ${reg.body.accessToken as string}`).expect(200);

    await agent.post("/auth/login").send({ email, password }).expect(200);

    const refresh = await agent.post("/auth/refresh").expect(200);
    expect(refresh.body.accessToken).toBeDefined();

    await agent
      .post("/auth/logout")
      .set("Authorization", `Bearer ${refresh.body.accessToken as string}`)
      .expect(204);

    await request(app.getHttpServer())
      .post("/auth/register")
      .set("x-internal-bridge", bridge)
      .send({ email, username: `other_${suffix}`, password: strongPassword("dup") })
      .expect(401);
  });

  it("flux partie : coups valides, coup illégal, abandon, PGN persisté", async () => {
    const bridge = process.env.INTERNAL_AUTH_BRIDGE_SECRET ?? "";
    const suffix = `${Date.now()}g`;
    const pw = strongPassword(suffix);

    const r1 = await request(app.getHttpServer())
      .post("/auth/register")
      .set("x-internal-bridge", bridge)
      .send({ email: `w${suffix}@t.local`, username: `w_${suffix}`, password: pw })
      .expect(201);
    const r2 = await request(app.getHttpServer())
      .post("/auth/register")
      .set("x-internal-bridge", bridge)
      .send({ email: `b${suffix}@t.local`, username: `b_${suffix}`, password: pw })
      .expect(201);

    const meWhite = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${r1.body.accessToken as string}`)
      .expect(200);
    const blackId = (
      await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${r2.body.accessToken as string}`)
        .expect(200)
    ).body.id as string;

    const gameRes = await request(app.getHttpServer())
      .post("/games")
      .set("Authorization", `Bearer ${r1.body.accessToken as string}`)
      .send({ opponentId: blackId })
      .expect(201);

    const gameId = gameRes.body.id as string;
    const whiteId = meWhite.body.id as string;

    const sessions = app.get(GameSessionService);

    expect((await sessions.handleMove(gameId, whiteId, { from: "e2", to: "e4" })).ok).toBe(true);
    expect((await sessions.handleMove(gameId, blackId, { from: "e7", to: "e5" })).ok).toBe(true);

    const bad = await sessions.handleMove(gameId, whiteId, { from: "e1", to: "e5" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error).toBe("coup_illegal");
    }

    const resign = await sessions.handleResign(gameId, whiteId);
    expect(resign.ok).toBe(true);

    const row = await prisma.game.findUnique({ where: { id: gameId } });
    expect(row?.pgn?.length ?? 0).toBeGreaterThan(10);
    expect(row?.pgn).toContain("0-1");
  });
});
