import { Injectable } from "@nestjs/common";
import type { Prisma, User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByUsernameWithRatings(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      include: { eloRatings: true },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  updateProfile(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async getUserStats(userId: string): Promise<{ gamesPlayed: number }> {
    const gamesPlayed = await this.prisma.game.count({
      where: { OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }] },
    });
    return { gamesPlayed };
  }
}
