import { Injectable, NotFoundException } from "@nestjs/common";
import { createPlayerFactory, Match } from "glicko-two";
import type { TimeControl } from "@prisma/client";
import type { GameResult as SharedGameResult } from "@royalchess/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { EloMatchOutcome, EloPlayerOutcome, EloPlayerSnapshot } from "./elo.types";

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

  /**
   * Variante "orientée partie" de `calculateNewRatings` : renvoie le
   * before/after/delta pour chaque couleur, ce qui permet de persister
   * `Game.{white,black}EloChange/After` et d'enrichir le payload `GAME_OVER`.
   *
   * Effets : lit puis met à jour `EloRating` pour `whitePlayerId` et
   * `blackPlayerId` sur le `timeControl` de la partie. Idempotence : laissée
   * à l'appelant (qui doit s'assurer de n'invoquer cette méthode qu'une fois
   * par partie via le pattern de finalisation existant).
   */
  async applyMatchResult(input: {
    readonly whitePlayerId: string;
    readonly blackPlayerId: string;
    readonly result: SharedGameResult;
    readonly timeControl: TimeControl;
  }): Promise<EloMatchOutcome> {
    const { whitePlayerId, blackPlayerId, result, timeControl } = input;
    const [whiteRow, blackRow] = await Promise.all([
      this.prisma.eloRating.findUnique({
        where: { userId_timeControl: { userId: whitePlayerId, timeControl } },
      }),
      this.prisma.eloRating.findUnique({
        where: { userId_timeControl: { userId: blackPlayerId, timeControl } },
      }),
    ]);
    if (!whiteRow || !blackRow) {
      throw new NotFoundException("Ratings introuvables pour ce contrôle de temps");
    }
    const whiteBefore = whiteRow.rating;
    const blackBefore = blackRow.rating;
    const whitePlayer = createPlayer({
      rating: whiteRow.rating,
      ratingDeviation: whiteRow.ratingDeviation,
      volatility: whiteRow.volatility,
    });
    const blackPlayer = createPlayer({
      rating: blackRow.rating,
      ratingDeviation: blackRow.ratingDeviation,
      volatility: blackRow.volatility,
    });
    // Le `Match` Glicko-2 distingue "team A vs team B" mais pas une couleur :
    // on map donc `white = A`, `black = B` et on rapporte le résultat de A.
    const match = new Match(whitePlayer, blackPlayer);
    if (result === "draw") {
      match.reportTie();
    } else if (result === "white") {
      match.reportTeamAWon();
    } else {
      match.reportTeamBWon();
    }
    match.updatePlayerRatings();
    const whiteAfter = Math.round(whitePlayer.rating);
    const blackAfter = Math.round(blackPlayer.rating);
    await this.prisma.$transaction([
      this.prisma.eloRating.update({
        where: { userId_timeControl: { userId: whitePlayerId, timeControl } },
        data: {
          rating: whiteAfter,
          ratingDeviation: Math.round(whitePlayer.ratingDeviation),
          volatility: whitePlayer.volatility,
          gamesPlayed: { increment: 1 },
        },
      }),
      this.prisma.eloRating.update({
        where: { userId_timeControl: { userId: blackPlayerId, timeControl } },
        data: {
          rating: blackAfter,
          ratingDeviation: Math.round(blackPlayer.ratingDeviation),
          volatility: blackPlayer.volatility,
          gamesPlayed: { increment: 1 },
        },
      }),
    ]);
    const white: EloPlayerOutcome = {
      userId: whitePlayerId,
      before: whiteBefore,
      after: whiteAfter,
      delta: whiteAfter - whiteBefore,
    };
    const black: EloPlayerOutcome = {
      userId: blackPlayerId,
      before: blackBefore,
      after: blackAfter,
      delta: blackAfter - blackBefore,
    };
    return { white, black };
  }
}
