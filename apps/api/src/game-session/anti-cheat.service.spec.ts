import { AntiCheatService } from "./anti-cheat.service";
import { GameSessionRepository } from "./game-session.repository";

describe("AntiCheatService", () => {
  it("incrémente le compteur suspect si les intervalles sont quasi constants", async () => {
    const sessionRepo = {
      pushMoveTiming: jest.fn().mockResolvedValue(undefined),
      incrementSuspicious: jest.fn().mockResolvedValue(1),
    } as unknown as GameSessionRepository;

    const redis = {
      lrange: jest.fn().mockResolvedValue(Array.from({ length: 10 }, () => "1000")),
    };

    const service = new AntiCheatService(sessionRepo, redis as never);
    await service.analyzeMove("g1", "u1", 1000, 2);

    expect(sessionRepo.pushMoveTiming).toHaveBeenCalledWith("g1", "u1", 1000);
    expect(redis.lrange).toHaveBeenCalled();
    expect(sessionRepo.incrementSuspicious).toHaveBeenCalled();
  });

  it("ne marque pas suspect si la variance des intervalles est élevée", async () => {
    const sessionRepo = {
      pushMoveTiming: jest.fn().mockResolvedValue(undefined),
      incrementSuspicious: jest.fn(),
    } as unknown as GameSessionRepository;

    const varied = ["200", "800", "300", "900", "250", "750", "400", "600", "350", "650"];
    const redis = {
      lrange: jest.fn().mockResolvedValue(varied),
    };

    const service = new AntiCheatService(sessionRepo, redis as never);
    await service.analyzeMove("g1", "u1", 400, 2);

    expect(sessionRepo.incrementSuspicious).not.toHaveBeenCalled();
  });
});
