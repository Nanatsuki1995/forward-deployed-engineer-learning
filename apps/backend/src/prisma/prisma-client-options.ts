import { PrismaPg } from '@prisma/adapter-pg';
import type { Prisma } from '@prisma/client';

export function createPrismaClientOptions(): Prisma.PrismaClientOptions {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to initialize PrismaClient');
  }

  return {
    adapter: new PrismaPg({ connectionString }),
  };
}
