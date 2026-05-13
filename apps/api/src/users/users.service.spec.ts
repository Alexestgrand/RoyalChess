import { ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import { GamesRepository } from "../games/games.repository";
import { AvatarUploadService } from "./avatar-upload.service";
import { UsersRepository } from "./users.repository";
import { UsersService } from "./users.service";

const avatarStub = {} as AvatarUploadService;

describe("UsersService — profil public stats", () => {
  const usersRepo = {
    findByUsername: jest.fn(),
  } as unknown as UsersRepository;

  const gamesRepo = {
    aggregateTerminalStatsForUser: jest.fn(),
  } as unknown as GamesRepository;

  async function createService(): Promise<UsersService> {
    const mod = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: usersRepo },
        { provide: GamesRepository, useValue: gamesRepo },
        { provide: AvatarUploadService, useValue: avatarStub },
      ],
    }).compile();
    return mod.get(UsersService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getPublicUserStats renvoie l’agrégation et le winRate", async () => {
    usersRepo.findByUsername = jest.fn().mockResolvedValue({
      id: "u1",
      isActive: true,
      role: UserRole.USER,
    });
    gamesRepo.aggregateTerminalStatsForUser = jest.fn().mockResolvedValue({
      totalGames: 4,
      wins: 2,
      losses: 1,
      draws: 1,
    });
    const svc = await createService();
    const r = await svc.getPublicUserStats("alice");
    expect(r).toEqual({
      totalGames: 4,
      wins: 2,
      losses: 1,
      draws: 1,
      winRate: 63,
    });
    expect(gamesRepo.aggregateTerminalStatsForUser).toHaveBeenCalledWith("u1");
  });

  it("getPublicUserStats lève 404 si utilisateur absent", async () => {
    usersRepo.findByUsername = jest.fn().mockResolvedValue(null);
    const svc = await createService();
    await expect(svc.getPublicUserStats("ghost")).rejects.toBeInstanceOf(NotFoundException);
    expect(gamesRepo.aggregateTerminalStatsForUser).not.toHaveBeenCalled();
  });
});

describe("UsersService — changement de mot de passe", () => {
  const usersRepo = {
    findById: jest.fn(),
    changePasswordAndRevokeRefreshTokens: jest.fn().mockResolvedValue(undefined),
  } as unknown as UsersRepository;

  const gamesRepo = {} as unknown as GamesRepository;

  async function createService(): Promise<UsersService> {
    const mod = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: usersRepo },
        { provide: GamesRepository, useValue: gamesRepo },
        { provide: AvatarUploadService, useValue: avatarStub },
      ],
    }).compile();
    return mod.get(UsersService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("réussit avec mot de passe actuel correct et révoque les refresh", async () => {
    const hash = await bcrypt.hash("OldPass1", 4);
    usersRepo.findById = jest.fn().mockResolvedValue({ id: "u1", passwordHash: hash });
    const svc = await createService();
    await svc.changePassword("u1", { currentPassword: "OldPass1", newPassword: "NewPass2a" });
    expect(usersRepo.changePasswordAndRevokeRefreshTokens).toHaveBeenCalledTimes(1);
    const call = (usersRepo.changePasswordAndRevokeRefreshTokens as jest.Mock).mock.calls[0] as [
      string,
      string,
    ];
    expect(call[0]).toBe("u1");
    expect(await bcrypt.compare("NewPass2a", call[1])).toBe(true);
  });

  it("refuse si compte OAuth sans mot de passe local", async () => {
    usersRepo.findById = jest.fn().mockResolvedValue({ id: "u1", passwordHash: null });
    const svc = await createService();
    await expect(
      svc.changePassword("u1", { currentPassword: "x", newPassword: "NewPass2a" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(usersRepo.changePasswordAndRevokeRefreshTokens).not.toHaveBeenCalled();
  });

  it("refuse si mot de passe actuel invalide", async () => {
    const hash = await bcrypt.hash("OldPass1", 4);
    usersRepo.findById = jest.fn().mockResolvedValue({ id: "u1", passwordHash: hash });
    const svc = await createService();
    await expect(
      svc.changePassword("u1", { currentPassword: "Wrong1", newPassword: "NewPass2a" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usersRepo.changePasswordAndRevokeRefreshTokens).not.toHaveBeenCalled();
  });
});

describe("UsersService — préférences", () => {
  const usersRepo = {
    findById: jest.fn(),
    updatePreferences: jest.fn(),
  } as unknown as UsersRepository;

  const gamesRepo = {} as unknown as GamesRepository;

  async function createService(): Promise<UsersService> {
    const mod = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: usersRepo },
        { provide: GamesRepository, useValue: gamesRepo },
        { provide: AvatarUploadService, useValue: {} },
      ],
    }).compile();
    return mod.get(UsersService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("patchPreferences fusionne sans perdre les clés absentes du patch", async () => {
    usersRepo.findById = jest.fn().mockResolvedValue({
      id: "u1",
      preferences: { soundEnabled: false, boardTheme: "forest-stone" },
    });
    usersRepo.updatePreferences = jest.fn().mockResolvedValue({});
    const svc = await createService();
    const r = await svc.patchPreferences("u1", { pieceTheme: "neo" });
    expect(r.soundEnabled).toBe(false);
    expect(r.boardTheme).toBe("forest-stone");
    expect(r.pieceTheme).toBe("neo");
    expect(usersRepo.updatePreferences).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        soundEnabled: false,
        boardTheme: "forest-stone",
        pieceTheme: "neo",
      }),
    );
  });
});
