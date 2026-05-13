import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { type Game, type User, UserRole } from "@prisma/client";
import { GamesRepository, type GameWithPlayers } from "../games/games.repository";
import { UsersRepository } from "./users.repository";
import type { UpdateProfileDto } from "./dto/update-profile.dto";

/**
 * Forme publique d'une partie pour l'historique du profil. Inclut les
 * deux joueurs (id + username + avatar) et toutes les métadonnées de fin
 * de partie (raison + deltas ELO) pour permettre un rendu côté client
 * sans appel supplémentaire.
 */
export interface PublicGameHistoryItem {
  readonly id: string;
  readonly status: string;
  readonly winner: string | null;
  readonly timeControl: string;
  readonly initialTime: number;
  readonly increment: number;
  readonly startedAt: string | null;
  readonly endedAt: string | null;
  readonly endReason: string | null;
  readonly fen: string | null;
  readonly whitePlayer: {
    readonly id: string;
    readonly username: string;
    readonly avatarUrl: string | null;
  };
  readonly blackPlayer: {
    readonly id: string;
    readonly username: string;
    readonly avatarUrl: string | null;
  } | null;
  readonly whiteEloChange: number | null;
  readonly blackEloChange: number | null;
  readonly whiteEloAfter: number | null;
  readonly blackEloAfter: number | null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly games: GamesRepository,
  ) {}

  async getPublicProfile(username: string): Promise<{
    id: string;
    username: string;
    avatarUrl: string | null;
    createdAt: Date;
    stats: { gamesPlayed: number };
    eloRatings: { timeControl: string; rating: number; gamesPlayed: number }[];
  }> {
    const user = await this.users.findByUsernameWithRatings(username);
    if (!user || !user.isActive || user.role === UserRole.BANNED) {
      throw new NotFoundException("Profil introuvable");
    }
    const stats = await this.users.getUserStats(user.id);
    const eloRatings = user.eloRatings.map((e) => ({
      timeControl: e.timeControl,
      rating: e.rating,
      gamesPlayed: e.gamesPlayed,
    }));
    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      stats,
      eloRatings,
    };
  }

  async getProfileById(userId: string): Promise<Pick<User, "id" | "email" | "username" | "avatarUrl">> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Pick<User, "id" | "username" | "avatarUrl">> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }
    if (dto.username) {
      const taken = await this.users.findByUsername(dto.username);
      if (taken && taken.id !== userId) {
        throw new ConflictException("Pseudo indisponible");
      }
    }
    const updated = await this.users.updateProfile(userId, {
      ...(dto.username ? { username: dto.username } : {}),
      ...(dto.avatarUrl !== undefined
        ? { avatarUrl: dto.avatarUrl === "" || dto.avatarUrl === null ? null : dto.avatarUrl }
        : {}),
    });
    return { id: updated.id, username: updated.username, avatarUrl: updated.avatarUrl };
  }

  async getGameHistory(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Game[]; total: number; page: number; limit: number }> {
    return this.games.findPaginatedForUser(userId, page, limit);
  }

  /**
   * Historique paginé pour un profil PUBLIC (page `/profile/[username]`).
   * Inclut les deux joueurs et expose les colonnes ELO/endReason. Renvoie
   * 404 si l'utilisateur n'existe pas ou est inactif/banni (cohérent avec
   * `getPublicProfile`).
   */
  async getPublicGameHistory(
    username: string,
    page: number,
    limit: number,
  ): Promise<{
    items: PublicGameHistoryItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const user = await this.users.findByUsername(username);
    if (!user || !user.isActive || user.role === UserRole.BANNED) {
      throw new NotFoundException("Profil introuvable");
    }
    const { items, total, page: p, limit: l } = await this.games.findPublicPaginatedForUser(
      user.id,
      page,
      limit,
    );
    return {
      items: items.map((g) => this.mapPublicGame(g)),
      total,
      page: p,
      limit: l,
    };
  }

  private mapPublicGame(game: GameWithPlayers): PublicGameHistoryItem {
    return {
      id: game.id,
      status: game.status,
      winner: game.winner,
      timeControl: game.timeControl,
      initialTime: game.initialTime,
      increment: game.increment,
      startedAt: game.startedAt ? game.startedAt.toISOString() : null,
      endedAt: game.endedAt ? game.endedAt.toISOString() : null,
      endReason: game.endReason ?? null,
      fen: game.fen ?? null,
      whitePlayer: {
        id: game.whitePlayer.id,
        username: game.whitePlayer.username,
        avatarUrl: game.whitePlayer.avatarUrl,
      },
      blackPlayer: game.blackPlayer
        ? {
            id: game.blackPlayer.id,
            username: game.blackPlayer.username,
            avatarUrl: game.blackPlayer.avatarUrl,
          }
        : null,
      whiteEloChange: game.whiteEloChange ?? null,
      blackEloChange: game.blackEloChange ?? null,
      whiteEloAfter: game.whiteEloAfter ?? null,
      blackEloAfter: game.blackEloAfter ?? null,
    };
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const existing = await this.users.findByUsername(username);
    return existing === null;
  }
}
