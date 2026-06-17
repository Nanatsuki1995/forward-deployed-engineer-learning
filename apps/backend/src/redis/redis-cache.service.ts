import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class RedisCacheService {
  constructor(private readonly redis: RedisService) {}

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.getJson<T>(key);

    if (cached !== undefined) {
      return cached;
    }

    const value = await loader();
    await this.setJson(key, value, ttlSeconds);

    return value;
  }

  async getJson<T>(key: string): Promise<T | undefined> {
    const value = await this.redis.execute((client) => client.get(key));

    if (!value) {
      return undefined;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      await this.delete(key);
      return undefined;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);

    await this.redis.execute((client) =>
      client.set(key, serialized, 'EX', ttlSeconds),
    );
  }

  async delete(key: string): Promise<void> {
    await this.redis.execute((client) => client.del(key));
  }
}
