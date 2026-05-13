import { Injectable } from "@nestjs/common";
import { GameStatus, GameWinner, TimeControl, type Game, type Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const playerSelect = {
  id: true,
  username: true,
  avatarUrl: true,
} as const;

export type GameWithPlayers = Prisma.GameGetPayload<{
  include: { whitePlayer: { select: typeof playerSelect }; blackPlayer: { select: typeof playerSelect } };
}>;

@Injectable()
export class GamesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { whitePlayerId: string; blackPlayerId: string }): Promise<Game> {
    return this.prisma.game.create({
      data: {
        whitePlayerId: data.whitePlayerId,
        blackPlayerId: data.blackPlayerId,
        status: GameStatus.ACTIVE,
        timeControl: TimeControl.RAPID,
        initialTime: 600,
        increment: 0,
        startedAt: new Date(),
      },
    });
  }

  findActiveGameForUser(userId: string): Promise<Game | null> {
    return this.prisma.game.findFirst({
      where: {
        AND: [
          {
            OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
          },
          {
            OR: [
              { status: GameStatus.ACTIVE },
              { AND: [{ status: GameStatus.WAITING }, { blackPlayerId: { not: null } }] },
            ],
          },
        ],
      },
    });
  }

  async createFromMatchmaking(data: {
    whitePlayerId: string;
    blackPlayerId: string;
    timeControl: TimeControl;
    initialTime: number;
    increment: number;
  }): Promise<Game> {
    return this.prisma.game.create({
      data: {
        whitePlayerId: data.whitePlayerId,
        blackPlayerId: data.blackPlayerId,
        status: GameStatus.WAITING,
        timeControl: data.timeControl,
        initialTime: data.initialTime,
        increment: data.increment,
      },
    });
  }

  async createPrivateWaiting(data: {
    whitePlayerId: string;
    timeControl: TimeControl;
    initialTime: number;
    increment: number;
    inviteCode: string;
  }): Promise<Game> {
    return this.prisma.game.create({
      data: {
        whitePlayerId: data.whitePlayerId,
        blackPlayerId: null,
        inviteCode: data.inviteCode,
        status: GameStatus.WAITING,
        timeControl: data.timeControl,
        initialTime: data.initialTime,
        increment: data.increment,
      },
    });
  }

  findByInviteCode(inviteCode: string): Promise<Game | null> {
    return this.prisma.game.findFirst({
      where: { inviteCode, status: GameStatus.WAITING },
    });
  }

  findByInviteCodeWithPlayers(inviteCode: string): Promise<GameWithPlayers | null> {
    return this.prisma.game.findFirst({
      where: { inviteCode, status: GameStatus.WAITING },
      include: {
        whitePlayer: { select: playerSelect },
        blackPlayer: { select: playerSelect },
      },
    });
  }

  async assignSecondPlayerAndActivate(gameId: string, blackPlayerId: string): Promise<GameWithPlayers> {
    await this.prisma.game.update({
      where: { id: gameId },
      data: {
        blackPlayerId,
        status: GameStatus.ACTIVE,
        startedAt: new Date(),
        inviteCode: null,
      },
    });
    const full = await this.findByIdWithPlayers(gameId);
    if (!full) {
      throw new Error("assignSecondPlayerAndActivate: partie introuvable");
    }
    return full;
  }

  /** Hôte joue les noirs : le rejoignant prend les blancs en base. */
  async assignJoinerAsWhiteAndActivate(gameId: string, joinerId: string): Promise<GameWithPlayers> {
    const row = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!row) {
      throw new Error("assignJoinerAsWhiteAndActivate: partie introuvable");
    }
    const hostId = row.whitePlayerId;
    if (hostId === joinerId) {
      throw new Error("assignJoinerAsWhiteAndActivate: joueur invalide");
    }
    await this.prisma.game.update({
      where: { id: gameId },
      data: {
        whitePlayerId: joinerId,
        blackPlayerId: hostId,
        status: GameStatus.ACTIVE,
        startedAt: new Date(),
        inviteCode: null,
      },
    });
    const full = await this.findByIdWithPlayers(gameId);
    if (!full) {
      throw new Error("assignJoinerAsWhiteAndActivate: partie introuvable après mise à jour");
    }
    return full;
  }

  async markGameActive(gameId: string): Promise<void> {
    await this.prisma.game.update({
      where: { id: gameId },
      data: { status: GameStatus.ACTIVE, startedAt: new Date() },
    });
  }

  findById(id: string): Promise<Game | null> {
    return this.prisma.game.findUnique({ where: { id } });
  }

  findByIdWithPlayers(id: string): Promise<GameWithPlayers | null> {
    return this.prisma.game.findUnique({
      where: { id },
      include: {
        whitePlayer: { select: playerSelect },
        blackPlayer: { select: playerSelect },
      },
    });
  }

  async finalizeGame(
    id: string,
    data: {
      status: GameStatus;
      winner: GameWinner | null;
      pgn: string;
      fen: string | null;
      endedAt: Date;
      endReason?: string | null;
      whiteEloChange?: number | null;
      blackEloChange?: number | null;
      whiteEloAfter?: number | null;
      blackEloAfter?: number | null;
    },
  ): Promise<Game> {
    return this.prisma.game.update({
      where: { id },
      data: {
        status: data.status,
        winner: data.winner,
        pgn: data.pgn,
        fen: data.fen,
        endedAt: data.endedAt,
        ...(data.endReason !== undefined ? { endReason: data.endReason } : {}),
        ...(data.whiteEloChange !== undefined ? { whiteEloChange: data.whiteEloChange } : {}),
        ...(data.blackEloChange !== undefined ? { blackEloChange: data.blackEloChange } : {}),
        ...(data.whiteEloAfter !== undefined ? { whiteEloAfter: data.whiteEloAfter } : {}),
        ...(data.blackEloAfter !== undefined ? { blackEloAfter: data.blackEloAfter } : {}),
      },
    });
  }

  listForUser(userId: string): Promise<Game[]> {
    return this.prisma.game.findMany({
      where: { OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async findPaginatedForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Game[]; total: number; page: number; limit: number }> {
    const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
    const safeLimit =
      Number.isFinite(limit) && limit >= 1 ? Math.min(50, Math.floor(limit)) : 20;
    const skip = (safePage - 1) * safeLimit;
    const where = { OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }] };
    const [items, total] = await Promise.all([
      this.prisma.game.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
      }),
      this.prisma.game.count({ where }),
    ]);
    return { items, total, page: safePage, limit: safeLimit };
  }

  /**
   * Variante "profil public" : inclut les deux joueurs pour permettre au
   * client (page profil `/profile/[username]`) d'afficher l'adversaire sans
   * round-trip supplémentaire. Toujours paginée + bornée.
   */
  async findPublicPaginatedForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: GameWithPlayers[]; total: number; page: number; limit: number }> {
    const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
    const safeLimit =
      Number.isFinite(limit) && limit >= 1 ? Math.min(50, Math.floor(limit)) : 20;
    const skip = (safePage - 1) * safeLimit;
    const where = { OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }] };
    const [items, total] = await Promise.all([
      this.prisma.game.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
        include: {
          whitePlayer: { select: playerSelect },
          blackPlayer: { select: playerSelect },
        },
      }),
      this.prisma.game.count({ where }),
    ]);
    return { items, total, page: safePage, limit: safeLimit };
  }
}
