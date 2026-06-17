import type { ConnectionOptions } from 'bullmq';
import { getNumberFromEnv } from '../redis/redis.service';

const DEFAULT_REDIS_URL = 'redis://localhost:6379';
const DEFAULT_CONNECT_TIMEOUT_MS = 500;

export function createBullmqConnectionOptions(): ConnectionOptions | null {
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.REDIS_ENABLED === 'false'
  ) {
    return null;
  }

  return {
    url: process.env.REDIS_URL ?? DEFAULT_REDIS_URL,
    connectTimeout: getNumberFromEnv(
      'REDIS_CONNECT_TIMEOUT_MS',
      DEFAULT_CONNECT_TIMEOUT_MS,
    ),
    enableOfflineQueue: false,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    skipVersionCheck: true,
  };
}
