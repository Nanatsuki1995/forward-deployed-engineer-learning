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
type SignMock = (payload: object) => string;

interface PrismaMock {
  user: {
    findUnique: jest.MockedFunction<FindUniqueMock>;
    create: jest.MockedFunction<CreateUserMock>;
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
    expect(response).toEqual({
      accessToken: 'signed-token',
      user: {
        id: 'user-1',
        name: 'New Agent',
        email: 'new.agent@example.com',
        role: 'agent',
      },
    });
    expect(jwtServiceMock.sign).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'new.agent@example.com',
      role: 'agent',
    });
  });
});

function createPrismaUser(overrides: Partial<PrismaUser> = {}): PrismaUser {
  const now = new Date('2026-06-11T00:00:00.000Z');

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
