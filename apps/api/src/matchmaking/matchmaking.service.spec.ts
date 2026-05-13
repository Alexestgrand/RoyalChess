import { Test } from "@nestjs/testing";
import { TimeControl } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS } from "../redis/redis.module";
import { GameSessionRepository } from "../game-session/game-session.repository";
import { GameSessionService } from "../game-session/game-session.service";
import { GamesRepository } from "../games/games.repository";
import { MatchmakingGateway } from "./matchmaking.gateway";
import { computeMatchmakingEloWindow, MatchmakingService } from "./matchmaking.service";

describe("computeMatchmakingEloWindow", () => {
  it("0–10s ±100, 10–20s ±200, 20–30s ±300, 30s+ ±500", () => {
    const t0 = 1_000_000;
    expect(computeMatchmakingEloWindow(t0, t0)).toBe(100);
    expect(computeMatchmakingEloWindow(t0, t0 + 9_999)).toBe(100);
    expect(computeMatchmakingEloWindow(t0, t0 + 10_000)).toBe(200);
    expect(computeMatchmakingEloWindow(t0, t0 + 19_999)).toBe(200);
    expect(computeMatchmakingEloWindow(t0, t0 + 20_000)).toBe(300);
    expect(computeMatchmakingEloWindow(t0, t0 + 29_999)).toBe(300);
    expect(computeMatchmakingEloWindow(t0, t0 + 30_000)).toBe(500);
    expect(computeMatchmakingEloWindow(t0, t0 + 120_000)).toBe(500);
  });
});

describe("MatchmakingService", () => {
  const redis = {
    zadd: jest.fn().mockResolvedValue(1),
    set: jest.fn().mockResolvedValue("OK"),
    zrangebyscore: jest.fn().mockResolvedValue([]),
    zrem: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    get: jest.fn().mockResolvedValue(null),
  };

  const prisma = {
    eloRating: {
      findUnique: jest.fn().mockResolvedValue({ rating: 1500 }),
    },
  } as unknown as PrismaService;

  const games = {
    findActiveGameForUser: jest.fn().mockResolvedValue(null),
  } as unknown as GamesRepository;

  const sessions = {
    seedSessionForMatchmadeGame: jest.fn().mockResolvedValue(undefined),
  } as unknown as GameSessionService;

  const sessionRepo = {
    getUserPlayingGame: jest.fn().mockResolvedValue(null),
  } as unknown as GameSessionRepository;

  const gateway = {
    emitMatchFound: jest.fn(),
  } as unknown as MatchmakingGateway;

  async function createService(): Promise<MatchmakingService> {
    const mod = await Test.createTestingModule({
      providers: [
        MatchmakingService,
        { provide: REDIS, useValue: redis },
        { provide: PrismaService, useValue: prisma },
        { provide: GamesRepository, useValue: games },
        { provide: GameSessionService, useValue: sessions },
        { provide: GameSessionRepository, useValue: sessionRepo },
        { provide: MatchmakingGateway, useValue: gateway },
      ],
    }).compile();
    return mod.get(MatchmakingService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("joinQueue refuse un payload invalide", async () => {
    const svc = await createService();
    const r = await svc.joinQueue("u1", { foo: "bar" }, "sock1");
    expect(r).toEqual({ ok: false, error: "payload_invalide" });
    expect(redis.zadd).not.toHaveBeenCalled();
  });

  it("joinQueue refuse si partie active", async () => {
    (games.findActiveGameForUser as jest.Mock).mockResolvedValueOnce({ id: "g1" });
    const svc = await createService();
    const r = await svc.joinQueue("u1", { timeControl: "RAPID", initialTime: 600, increment: 0 }, "sock1");
    expect(r).toEqual({ ok: false, error: "deja_en_partie" });
    (games.findActiveGameForUser as jest.Mock).mockResolvedValue(null);
  });

  it("joinQueue enregistre le joueur et tente l'appariement", async () => {
    const svc = await createService();
    const r = await svc.joinQueue("u1", { timeControl: "RAPID", initialTime: 600, increment: 0 }, "sock1");
    expect(r).toEqual({ ok: true, timeControl: TimeControl.RAPID, initialTime: 600, increment: 0 });
    expect(redis.zadd).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalled();
    expect(redis.zrangebyscore).toHaveBeenCalled();
  });
});
