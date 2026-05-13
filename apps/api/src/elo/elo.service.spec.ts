import { NotFoundException } from "@nestjs/common";
import { TimeControl } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EloService } from "./elo.service";

describe("EloService", () => {
  const prisma = {
    eloRating: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  } as unknown as PrismaService;

  const service = new EloService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("expectedScore favorise le joueur mieux classé", () => {
    const high = service.expectedScore(1800, 1500);
    const low = service.expectedScore(1500, 1800);
    expect(high).toBeGreaterThan(0.8);
    expect(low).toBeLessThan(0.2);
  });

  it("calcule Glicko-2 : victoire attendue (fort vs faible) augmente peu le fort", async () => {
    (prisma.eloRating.findUnique as jest.Mock).mockImplementation(
      (args: { where: { userId_timeControl: { userId: string } } }) => {
        const id = args.where.userId_timeControl.userId;
        if (id === "winner") {
          return { rating: 2000, ratingDeviation: 60, volatility: 0.06 };
        }
        return { rating: 1200, ratingDeviation: 350, volatility: 0.06 };
      },
    );
    (prisma.eloRating.update as jest.Mock).mockResolvedValue({});

    const out = await service.calculateNewRatings("winner", "loser", false, TimeControl.BLITZ);

    expect(out.winner.rating).toBeGreaterThan(2000);
    expect(out.winner.rating).toBeLessThan(2015);
    expect(out.loser.rating).toBeLessThan(1200);
  });

  it("calcule Glicko-2 : upset (faible bat fort) fait monter fortement le faible", async () => {
    (prisma.eloRating.findUnique as jest.Mock).mockImplementation(
      (args: { where: { userId_timeControl: { userId: string } } }) => {
        const id = args.where.userId_timeControl.userId;
        if (id === "underdog") {
          return { rating: 1300, ratingDeviation: 80, volatility: 0.06 };
        }
        return { rating: 2000, ratingDeviation: 60, volatility: 0.06 };
      },
    );
    (prisma.eloRating.update as jest.Mock).mockResolvedValue({});

    const out = await service.calculateNewRatings("underdog", "favorite", false, TimeControl.RAPID);

    expect(out.winner.rating).toBeGreaterThan(1300);
    expect(out.loser.rating).toBeLessThan(2000);
  });

  it("lève NotFoundException si un rating manque", async () => {
    (prisma.eloRating.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      service.calculateNewRatings("a", "b", false, TimeControl.BULLET),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
