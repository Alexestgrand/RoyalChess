import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { type Game, type User, UserRole } from "@prisma/client";
import { GamesRepository } from "../games/games.repository";
import { UsersRepository } from "./users.repository";
import type { UpdateProfileDto } from "./dto/update-profile.dto";

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

  async isUsernameAvailable(username: string): Promise<boolean> {
    const existing = await this.users.findByUsername(username);
    return existing === null;
  }
}
