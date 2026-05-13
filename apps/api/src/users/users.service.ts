import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { type Game, type User, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { GamesRepository, type GameWithPlayers } from "../games/games.repository";
import { UsersRepository } from "./users.repository";
import { AvatarUploadService } from "./avatar-upload.service";
import type { EloHistoryQueryDto } from "./dto/elo-history-query.dto";
import type { UpdatePasswordDto } from "./dto/update-password.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import {
  mergeUserPreferences,
  parseStoredUserPreferences,
  type UserPreferences,
  type UserPreferencesPatch,
} from "@royalchess/shared";
import { computeWinRatePct } from "./public-stats.util";
import type {
  PublicEloHistoryPointDto,
  PublicEloHistoryResponseDto,
  PublicUserGameStatsDto,
} from "./public-user-read.types";

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
    private readonly avatarUpload: AvatarUploadService,
  ) {}

  async getPublicUserStats(username: string): Promise<PublicUserGameStatsDto> {
    const user = await this.users.findByUsername(username);
    if (!user || !user.isActive || user.role === UserRole.BANNED) {
      throw new NotFoundException("Profil introuvable");
    }
    const { totalGames, wins, losses, draws } = await this.games.aggregateTerminalStatsForUser(user.id);
    return {
      totalGames,
      wins,
      losses,
      draws,
      winRate: computeWinRatePct(wins, losses, draws),
    };
  }

  async getPublicEloHistory(username: string, query: EloHistoryQueryDto): Promise<PublicEloHistoryResponseDto> {
    const user = await this.users.findByUsername(username);
    if (!user || !user.isActive || user.role === UserRole.BANNED) {
      throw new NotFoundException("Profil introuvable");
    }
    const rows = await this.games.findEloHistoryPointsForUser(user.id, query.timeControl, query.limit);
    const points: PublicEloHistoryPointDto[] = rows.map((r) => {
      const isWhite = r.whitePlayerId === user.id;
      const rating = isWhite ? r.whiteEloAfter! : r.blackEloAfter!;
      const opponent = isWhite ? r.blackPlayer : r.whitePlayer;
      return {
        date: r.endedAt.toISOString(),
        rating,
        opponentUsername: opponent?.username ?? "—",
        gameId: r.id,
      };
    });
    return { points };
  }

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

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Pick<User, "id" | "username" | "avatarUrl" | "email">> {
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
    if (dto.email !== undefined) {
      const takenEmail = await this.users.findByEmail(dto.email);
      if (takenEmail && takenEmail.id !== userId) {
        throw new ConflictException("Email indisponible");
      }
    }
    const updated = await this.users.updateProfile(userId, {
      ...(dto.username ? { username: dto.username } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.avatarUrl !== undefined
        ? { avatarUrl: dto.avatarUrl === "" || dto.avatarUrl === null ? null : dto.avatarUrl }
        : {}),
    });
    return { id: updated.id, username: updated.username, avatarUrl: updated.avatarUrl, email: updated.email };
  }

  async uploadAvatarBuffer(userId: string, buffer: Buffer): Promise<Pick<User, "id" | "username" | "avatarUrl" | "email">> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }
    const avatarUrl = await this.avatarUpload.processAndSaveAvatar(userId, buffer);
    const updated = await this.users.updateProfile(userId, { avatarUrl });
    return { id: updated.id, username: updated.username, avatarUrl: updated.avatarUrl, email: updated.email };
  }

  async changePassword(userId: string, dto: UpdatePasswordDto): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }
    if (!user.passwordHash) {
      throw new ForbiddenException({ code: "oauth_no_local_password" });
    }
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Identifiants invalides");
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.users.changePasswordAndRevokeRefreshTokens(userId, passwordHash);
  }

  async patchPreferences(userId: string, patch: UserPreferencesPatch): Promise<UserPreferences> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }
    const current = parseStoredUserPreferences(user.preferences ?? undefined);
    const merged = mergeUserPreferences(current, patch);
    await this.users.updatePreferences(userId, merged);
    return merged;
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
    // Prisma renvoie les enums en MAJUSCULES ; le front attend des chaînes
    // minuscules (aligné sur `GameResult` shared + logique `won`/`draw`).
    return {
      id: game.id,
      status: game.status.toLowerCase(),
      winner: game.winner ? game.winner.toLowerCase() : null,
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
