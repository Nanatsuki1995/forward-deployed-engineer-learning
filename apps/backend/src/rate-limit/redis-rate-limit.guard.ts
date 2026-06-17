import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { RedisService, getNumberFromEnv } from '../redis/redis.service';

const DEFAULT_LIMIT = 120;
const DEFAULT_WINDOW_SECONDS = 60;

@Injectable()
export class RedisRateLimitGuard implements CanActivate {
  private readonly limit = getNumberFromEnv('RATE_LIMIT_MAX', DEFAULT_LIMIT);
  private readonly windowSeconds = getNumberFromEnv(
    'RATE_LIMIT_WINDOW_SECONDS',
    DEFAULT_WINDOW_SECONDS,
  );

  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (this.shouldSkip(request)) {
      return true;
    }

    const key = this.getKey(request);
    const allowed = await this.redis.execute(async (client) => {
      const count = await client.incr(key);

      if (count === 1) {
        await client.expire(key, this.windowSeconds);
      }

      return count <= this.limit;
    });

    if (allowed === false) {
      throw new HttpException(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private shouldSkip(request: Request): boolean {
    const path = request.url.split('?')[0] ?? request.url;

    return (
      path.startsWith('/api/health') ||
      path.startsWith('/api/docs') ||
      path.startsWith('/api-json') ||
      path === '/'
    );
  }

  private getKey(request: Request): string {
    const ip =
      request.ip ||
      request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      request.socket.remoteAddress ||
      'unknown';
    const path = request.url.split('?')[0] ?? request.url;

    return `rate-limit:${ip}:${request.method}:${path}`;
  }
}
