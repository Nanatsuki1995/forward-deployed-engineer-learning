import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { mapUser } from '../data/workbench.mapper';
import type { User } from '../data/workbench.types';
import type { JwtPayload } from './auth.types';

interface LoginInput {
  email?: string;
  password?: string;
}

interface RegisterInput {
  name?: string;
  email?: string;
  password?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    input: LoginInput = {},
  ): Promise<{ accessToken: string; user: User }> {
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

    return {
      accessToken: this.issueToken(mapUser(user)),
      user: mapUser(user),
    };
  }

  async register(
    input: RegisterInput = {},
  ): Promise<{ accessToken: string; user: User }> {
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

    return {
      accessToken: this.issueToken(mapUser(user)),
      user: mapUser(user),
    };
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
}
