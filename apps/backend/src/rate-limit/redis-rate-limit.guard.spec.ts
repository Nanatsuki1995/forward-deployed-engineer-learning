import { ExecutionContext } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { RedisRateLimitGuard } from './redis-rate-limit.guard';

type RateLimitRedisClient = {
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number>;
};

type ExecuteCallback = (client: RateLimitRedisClient) => Promise<boolean>;
type ExecuteMock = (operation: ExecuteCallback) => Promise<boolean>;

function createContext(url: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        url,
        method: 'POST',
        ip: '127.0.0.1',
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('RedisRateLimitGuard', () => {
  const originalLimit = process.env.RATE_LIMIT_MAX;
  const originalWindow = process.env.RATE_LIMIT_WINDOW_SECONDS;

  afterEach(() => {
    if (originalLimit === undefined) {
      delete process.env.RATE_LIMIT_MAX;
    } else {
      process.env.RATE_LIMIT_MAX = originalLimit;
    }

    if (originalWindow === undefined) {
      delete process.env.RATE_LIMIT_WINDOW_SECONDS;
    } else {
      process.env.RATE_LIMIT_WINDOW_SECONDS = originalWindow;
    }
  });

  it('allows requests while Redis count is under the configured limit', async () => {
    process.env.RATE_LIMIT_MAX = '2';
    process.env.RATE_LIMIT_WINDOW_SECONDS = '60';

    let count = 0;
    const runExecute: ExecuteMock = (operation) =>
      operation({
        incr: () => {
          count += 1;
          return Promise.resolve(count);
        },
        expire: () => Promise.resolve(1),
      });
    const redisMock = {
      execute: jest.fn<ExecuteMock>(runExecute),
    };
    const guard = new RedisRateLimitGuard(redisMock as unknown as RedisService);

    await expect(
      guard.canActivate(createContext('/api/tickets')),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(createContext('/api/tickets')),
    ).resolves.toBe(true);

    try {
      await guard.canActivate(createContext('/api/tickets'));
      throw new Error('Expected request to be rate limited');
    } catch (error: unknown) {
      expect(error).toHaveProperty('status', 429);
      expect(error).toHaveProperty('response.code', 'RATE_LIMIT_EXCEEDED');
    }
  });

  it('skips public health checks', async () => {
    const redisMock = { execute: jest.fn() };
    const guard = new RedisRateLimitGuard(redisMock as unknown as RedisService);

    await expect(guard.canActivate(createContext('/api/health'))).resolves.toBe(
      true,
    );
    expect(redisMock.execute).not.toHaveBeenCalled();
  });
});
