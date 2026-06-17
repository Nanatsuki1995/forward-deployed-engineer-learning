import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis, { type RedisOptions } from 'ioredis';

const DEFAULT_REDIS_URL = 'redis://localhost:6379';
const DEFAULT_CONNECT_TIMEOUT_MS = 500;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly clients = new Set<Redis>();
  private client?: Redis | null;

  isEnabled(): boolean {
    return (
      process.env.NODE_ENV !== 'test' && process.env.REDIS_ENABLED !== 'false'
    );
  }

  createClient(options: RedisOptions = {}): Redis | null {
    if (!this.isEnabled()) {
      return null;
    }

    const client = new Redis(process.env.REDIS_URL ?? DEFAULT_REDIS_URL, {
      connectTimeout: getNumberFromEnv(
        'REDIS_CONNECT_TIMEOUT_MS',
        DEFAULT_CONNECT_TIMEOUT_MS,
      ),
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      ...options,
    });

    client.on('error', (error) => {
      this.logger.warn(`Redis error: ${error.message}`);
    });
    this.clients.add(client);

    return client;
  }

  async execute<T>(
    operation: (client: Redis) => Promise<T>,
  ): Promise<T | undefined> {
    const client = this.getClient();

    if (!client) {
      return undefined;
    }

    try {
      return await operation(client);
    } catch (error) {
      this.logger.warn(`Redis operation failed: ${getErrorMessage(error)}`);
      return undefined;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      Array.from(this.clients).map(async (client) => {
        try {
          await client.quit();
        } catch {
          client.disconnect();
        }
      }),
    );
  }

  private getClient(): Redis | null {
    if (!this.client) {
      this.client = this.createClient();
    }

    return this.client ?? null;
  }
}

export function getNumberFromEnv(key: string, fallback: number): number {
  const value = Number(process.env[key]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
