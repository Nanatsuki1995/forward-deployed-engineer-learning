import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { mapUser } from '../data/workbench.mapper';
import type { User } from '../data/workbench.types';
import type { AuthResponse, JwtPayload } from './auth.types';

interface LoginInput {
  email?: string;
  password?: string;
}

interface RegisterInput {
  name?: string;
  email?: string;
  password?: string;
}

interface RefreshInput {
  refreshToken?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(input: LoginInput = {}): Promise<AuthResponse> {
    const email = input.email?.trim().toLowerCase();
    const password = input.password ?? '';

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueSession(mapUser(user));
  }

  async register(input: RegisterInput = {}): Promise<AuthResponse> {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const password = input.password ?? '';

    if (!name || !email || !password) {
      throw new BadRequestException('Name, email, and password are required');
    }

    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    return this.issueSession(mapUser(user));
  }

  async refresh(input: RefreshInput = {}): Promise<AuthResponse> {
    const parsedToken = this.parseRefreshToken(input.refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: parsedToken.id },
      include: { user: true },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isRefreshTokenValid = await compare(
      parsedToken.secret,
      storedToken.tokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const revokeResult = await this.prisma.refreshToken.updateMany({
      where: {
        id: storedToken.id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    if (revokeResult.count !== 1) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.issueSession(mapUser(storedToken.user));
  }

  async logout(input: RefreshInput = {}): Promise<{ success: true }> {
    await this.revokeRefreshToken(input.refreshToken);

    return { success: true };
  }

  async me(userId: string): Promise<User> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    return mapUser(user);
  }

  private issueToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  private async issueSession(user: User): Promise<AuthResponse> {
    return {
      accessToken: this.issueToken(user),
      refreshToken: await this.issueRefreshToken(user.id),
      user,
    };
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const tokenId = randomUUID();
    const secret = randomBytes(32).toString('base64url');
    const tokenHash = await hash(secret, 10);
    const expiresAt = new Date(Date.now() + this.refreshTokenTtlMs());

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return `${tokenId}.${secret}`;
  }

  private async revokeRefreshToken(refreshToken?: string): Promise<void> {
    let parsedToken: { id: string; secret: string };

    try {
      parsedToken = this.parseRefreshToken(refreshToken);
    } catch {
      return;
    }

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: parsedToken.id },
    });

    if (!storedToken || storedToken.revokedAt) {
      return;
    }

    const isRefreshTokenValid = await compare(
      parsedToken.secret,
      storedToken.tokenHash,
    );

    if (!isRefreshTokenValid) {
      return;
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });
  }

  private parseRefreshToken(refreshToken?: string): {
    id: string;
    secret: string;
  } {
    const [id, secret] = refreshToken?.split('.') ?? [];

    if (!id || !secret) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return { id, secret };
  }

  private refreshTokenTtlMs(): number {
    const ttlDays = Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS ?? '7');
    const normalizedTtlDays =
      Number.isFinite(ttlDays) && ttlDays > 0 ? ttlDays : 7;

    return normalizedTtlDays * 24 * 60 * 60 * 1000;
  }
}
