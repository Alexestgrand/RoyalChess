import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";

jest.mock("bcrypt", () => ({
  __esModule: true,
  ...jest.requireActual("bcrypt"),
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue("$2b$12$hashedpasswordhere"),
}));

describe("AuthService", () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    eloRating: { createMany: jest.fn() },
    refreshToken: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const jwt = {
    sign: jest.fn().mockReturnValue("signed.jwt.token"),
    verify: jest.fn(),
  } as unknown as JwtService;

  const config = {
    getOrThrow: jest.fn((k: string) => {
      if (k === "JWT_ACCESS_SECRET") {
        return "a".repeat(32);
      }
      if (k === "JWT_REFRESH_SECRET") {
        return "b".repeat(32);
      }
      if (k === "JWT_ACCESS_EXPIRES") {
        return "15m";
      }
      if (k === "JWT_REFRESH_EXPIRES") {
        return "7d";
      }
      throw new Error(`unexpected ${k}`);
    }),
  } as unknown as ConfigService;

  const service = new AuthService(prisma, jwt, config);

  const registerDto: RegisterDto = {
    email: "new@example.com",
    username: "newuser",
    password: "Abcd1234!",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (cb: (tx: { user: { create: jest.Mock }; eloRating: { createMany: jest.Mock } }) => Promise<unknown>) => {
        const tx = {
          user: {
            create: jest.fn().mockResolvedValue({
              id: "user-1",
              email: registerDto.email,
              username: registerDto.username,
            }),
          },
          eloRating: {
            createMany: jest.fn().mockResolvedValue({ count: 4 }),
          },
        };
        return cb(tx);
      },
    );
    (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});
    (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
  });

  it("register crée un compte et retourne une paire de jetons", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    const tokens = await service.register(registerDto);
    expect(tokens.accessToken).toBe("signed.jwt.token");
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  it("register refuse un email ou pseudo déjà pris", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: "x" });
    await expect(service.register(registerDto)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("login réussit avec bons identifiants", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      passwordHash: "$2b$12$hash",
      isActive: true,
      role: "USER",
    });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    const dto: LoginDto = { email: "a@b.com", password: "secret" };
    const tokens = await service.login(dto);
    expect(tokens.accessToken).toBeDefined();
  });

  it("login échoue avec mauvais mot de passe", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      passwordHash: "$2b$12$hash",
      isActive: true,
      role: "USER",
    });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
    await expect(service.login({ email: "a@b.com", password: "wrong" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("login échoue si utilisateur inexistant", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.login({ email: "nope@x.com", password: "Abcd1234!" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("refreshTokens révoque l'ancien jeton et en émet un nouveau", async () => {
    const oldRefresh = "old.refresh.token";
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: "u1",
      email: "a@b.com",
      typ: "refresh",
      jti: "jti-1",
    });
    const { sha256Hex } = await import("./auth-hash");
    const hash = sha256Hex(oldRefresh);
    (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue({
      id: "rt1",
      jti: "jti-1",
      userId: "u1",
      tokenHash: hash,
      isRevoked: false,
    });
    (prisma.refreshToken.update as jest.Mock).mockResolvedValue({});
    const out = await service.refreshTokens(oldRefresh);
    expect(out.accessToken).toBe("signed.jwt.token");
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "rt1" }, data: { isRevoked: true } }),
    );
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });
});
