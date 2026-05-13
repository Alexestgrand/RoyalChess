import { Injectable, NotFoundException } from "@nestjs/common";
import { createPlayerFactory, Match } from "glicko-two";
import type { TimeControl } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { EloPlayerSnapshot } from "./elo.types";

const createPlayer = createPlayerFactory({
  defaultRating: 1500,
  defaultRatingDeviation: 350,
  defaultVolatility: 0.06,
  tau: 0.5,
});

@Injectable()
export class EloService {
  constructor(private readonly prisma: PrismaService) {}

  expectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  }

  nextRating(current: number, opponent: number, score: 0 | 0.5 | 1, k = 32): number {
    const expected = this.expectedScore(current, opponent);
    return Math.round(current + k * (score - expected));
  }

  /**
   * Glicko-2 après une partie.
   * En cas de nulle (`isDraw`), `winnerId` et `loserId` sont respectivement les deux joueurs (ordre arbitraire).
   * En partie décisive : `winnerId` = vainqueur, `loserId` = perdant.
   */
  async calculateNewRatings(
    winnerId: string,
    loserId: string,
    isDraw: boolean,
    timeControl: TimeControl,
  ): Promise<{ winner: EloPlayerSnapshot; loser: EloPlayerSnapshot }> {
    const [aRow, bRow] = await Promise.all([
      this.prisma.eloRating.findUnique({
        where: { userId_timeControl: { userId: winnerId, timeControl } },
      }),
      this.prisma.eloRating.findUnique({
        where: { userId_timeControl: { userId: loserId, timeControl } },
      }),
    ]);
    if (!aRow || !bRow) {
      throw new NotFoundException("Ratings introuvables pour ce contrôle de temps");
    }
    const teamA = createPlayer({
      rating: aRow.rating,
      ratingDeviation: aRow.ratingDeviation,
      volatility: aRow.volatility,
    });
    const teamB = createPlayer({
      rating: bRow.rating,
      ratingDeviation: bRow.ratingDeviation,
      volatility: bRow.volatility,
    });
    const match = new Match(teamA, teamB);
    if (isDraw) {
      match.reportTie();
    } else {
      match.reportTeamAWon();
    }
    match.updatePlayerRatings();
    const snapA: EloPlayerSnapshot = {
      userId: winnerId,
      rating: Math.round(teamA.rating),
      ratingDeviation: Math.round(teamA.ratingDeviation),
      volatility: teamA.volatility,
    };
    const snapB: EloPlayerSnapshot = {
      userId: loserId,
      rating: Math.round(teamB.rating),
      ratingDeviation: Math.round(teamB.ratingDeviation),
      volatility: teamB.volatility,
    };
    await this.prisma.$transaction([
      this.prisma.eloRating.update({
        where: { userId_timeControl: { userId: winnerId, timeControl } },
        data: {
          rating: snapA.rating,
          ratingDeviation: snapA.ratingDeviation,
          volatility: snapA.volatility,
          gamesPlayed: { increment: 1 },
        },
      }),
      this.prisma.eloRating.update({
        where: { userId_timeControl: { userId: loserId, timeControl } },
        data: {
          rating: snapB.rating,
          ratingDeviation: snapB.ratingDeviation,
          volatility: snapB.volatility,
          gamesPlayed: { increment: 1 },
        },
      }),
    ]);
    return { winner: snapA, loser: snapB };
  }
}
