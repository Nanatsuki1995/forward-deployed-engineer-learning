import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, type User as PrismaUser } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

type FindUniqueMock = (
  args: unknown,
) => Promise<PrismaUser | { id: string } | null>;
type CreateUserMock = (args: {
  data: {
    name: string;
    email: string;
    passwordHash: string;
  };
}) => Promise<PrismaUser>;
type RefreshTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: PrismaUser;
};
type CreateRefreshTokenMock = (args: {
  data: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  };
}) => Promise<RefreshTokenRecord>;
type FindUniqueRefreshTokenMock = (
  args: unknown,
) => Promise<RefreshTokenRecord | null>;
type UpdateRefreshTokenMock = (args: {
  where: { id: string };
  data: { revokedAt: Date };
}) => Promise<RefreshTokenRecord>;
type UpdateManyRefreshTokenMock = (args: {
  where: { id: string; revokedAt: null };
  data: { revokedAt: Date };
}) => Promise<{ count: number }>;
type SignMock = (payload: object) => string;

interface PrismaMock {
  user: {
    findUnique: jest.MockedFunction<FindUniqueMock>;
    create: jest.MockedFunction<CreateUserMock>;
  };
  refreshToken: {
    create: jest.MockedFunction<CreateRefreshTokenMock>;
    findUnique: jest.MockedFunction<FindUniqueRefreshTokenMock>;
    update: jest.MockedFunction<UpdateRefreshTokenMock>;
    updateMany: jest.MockedFunction<UpdateManyRefreshTokenMock>;
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: PrismaMock;
  let jwtServiceMock: {
    sign: jest.MockedFunction<SignMock>;
  };

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: jest.fn<FindUniqueMock>(),
        create: jest.fn<CreateUserMock>(),
      },
      refreshToken: {
        create: jest
          .fn<CreateRefreshTokenMock>()
          .mockImplementation((args: Parameters<CreateRefreshTokenMock>[0]) =>
            Promise.resolve(createRefreshToken(args.data)),
          ),
        findUnique: jest.fn<FindUniqueRefreshTokenMock>(),
        update: jest
          .fn<UpdateRefreshTokenMock>()
          .mockImplementation((args: Parameters<UpdateRefreshTokenMock>[0]) =>
            Promise.resolve(
              createRefreshToken({
                id: args.where.id,
                revokedAt: args.data.revokedAt,
              }),
            ),
          ),
        updateMany: jest
          .fn<UpdateManyRefreshTokenMock>()
          .mockResolvedValue({ count: 1 }),
      },
    };
    jwtServiceMock = {
      sign: jest.fn<SignMock>().mockReturnValue('signed-token'),
    };
    service = new AuthService(
      prismaMock as unknown as PrismaService,
      jwtServiceMock as unknown as JwtService,
    );
  });

  it('requires explicit login credentials', async () => {
    await expect(service.login({})).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(jwtServiceMock.sign).not.toHaveBeenCalled();
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rejects invalid passwords', async () => {
    const passwordHash = await hash('password123', 10);
    prismaMock.user.findUnique.mockResolvedValue(
      createPrismaUser({ passwordHash }),
    );

    await expect(
      service.login({
        email: 'agent@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(jwtServiceMock.sign).not.toHaveBeenCalled();
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rejects registration when the email already exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-admin' });

    await expect(
      service.register({
        name: 'Someone',
        email: 'admin@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(jwtServiceMock.sign).not.toHaveBeenCalled();
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it('registers new users as agents with their submitted password', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(({ data }) =>
      Promise.resolve(
        createPrismaUser({
          name: data.name,
          email: data.email,
          passwordHash: data.passwordHash,
        }),
      ),
    );

    const response = await service.register({
      name: 'New Agent',
      email: 'New.Agent@Example.com',
      password: 'password123',
    });

    const createArgs = prismaMock.user.create.mock.calls[0]?.[0];
    expect(createArgs?.data.email).toBe('new.agent@example.com');
    expect(createArgs?.data.name).toBe('New Agent');
    expect(
      await compare('password123', createArgs?.data.passwordHash ?? ''),
    ).toBe(true);
    expect(response.accessToken).toBe('signed-token');
    expect(typeof response.refreshToken).toBe('string');
    expect(response.user).toEqual({
      id: 'user-1',
      name: 'New Agent',
      email: 'new.agent@example.com',
      role: 'agent',
    });
    expect(jwtServiceMock.sign).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'new.agent@example.com',
      role: 'agent',
    });

    const refreshCreateArgs = prismaMock.refreshToken.create.mock.calls[0]?.[0];
    const [refreshTokenId, refreshTokenSecret] =
      response.refreshToken.split('.');
    expect(refreshCreateArgs?.data.id).toBe(refreshTokenId);
    expect(refreshCreateArgs?.data.userId).toBe('user-1');
    expect(refreshCreateArgs?.data.expiresAt).toBeInstanceOf(Date);
    expect(
      await compare(
        refreshTokenSecret ?? '',
        refreshCreateArgs?.data.tokenHash ?? '',
      ),
    ).toBe(true);
  });

  it('rotates refresh tokens and returns a fresh session', async () => {
    const tokenHash = await hash('refresh-secret', 10);
    prismaMock.refreshToken.findUnique.mockResolvedValue(
      createRefreshToken({
        id: 'refresh-token-1',
        tokenHash,
        user: createPrismaUser(),
      }),
    );

    const response = await service.refresh({
      refreshToken: 'refresh-token-1.refresh-secret',
    });

    expect(response.accessToken).toBe('signed-token');
    expect(typeof response.refreshToken).toBe('string');
    expect(response.user).toEqual({
      id: 'user-1',
      name: 'Agent',
      email: 'agent@example.com',
      role: 'agent',
    });
    const refreshUpdateArgs =
      prismaMock.refreshToken.updateMany.mock.calls[0]?.[0];
    expect(refreshUpdateArgs?.where.id).toBe('refresh-token-1');
    expect(refreshUpdateArgs?.where.revokedAt).toBeNull();
    expect(refreshUpdateArgs?.data.revokedAt).toBeInstanceOf(Date);
    expect(prismaMock.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('rejects revoked refresh tokens', async () => {
    const tokenHash = await hash('refresh-secret', 10);
    prismaMock.refreshToken.findUnique.mockResolvedValue(
      createRefreshToken({
        id: 'refresh-token-1',
        tokenHash,
        revokedAt: new Date('2026-06-11T01:00:00.000Z'),
        user: createPrismaUser(),
      }),
    );

    await expect(
      service.refresh({ refreshToken: 'refresh-token-1.refresh-secret' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.refreshToken.update).not.toHaveBeenCalled();
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rejects refresh tokens that were already rotated concurrently', async () => {
    const tokenHash = await hash('refresh-secret', 10);
    prismaMock.refreshToken.findUnique.mockResolvedValue(
      createRefreshToken({
        id: 'refresh-token-1',
        tokenHash,
        user: createPrismaUser(),
      }),
    );
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.refresh({ refreshToken: 'refresh-token-1.refresh-secret' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it('revokes refresh tokens on logout', async () => {
    const tokenHash = await hash('refresh-secret', 10);
    prismaMock.refreshToken.findUnique.mockResolvedValue(
      createRefreshToken({
        id: 'refresh-token-1',
        tokenHash,
      }),
    );

    await expect(
      service.logout({ refreshToken: 'refresh-token-1.refresh-secret' }),
    ).resolves.toEqual({ success: true });

    const logoutUpdateArgs = prismaMock.refreshToken.update.mock.calls[0]?.[0];
    expect(logoutUpdateArgs?.where.id).toBe('refresh-token-1');
    expect(logoutUpdateArgs?.data.revokedAt).toBeInstanceOf(Date);
  });
});

function createPrismaUser(overrides: Partial<PrismaUser> = {}): PrismaUser {
  const now = new Date();

  return {
    id: 'user-1',
    name: 'Agent',
    email: 'agent@example.com',
    passwordHash: 'hashed-password',
    role: UserRole.AGENT,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createRefreshToken(
  overrides: Partial<RefreshTokenRecord> = {},
): RefreshTokenRecord {
  const now = new Date();

  return {
    id: 'refresh-token-id',
    userId: 'user-1',
    tokenHash: 'hashed-refresh-token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
