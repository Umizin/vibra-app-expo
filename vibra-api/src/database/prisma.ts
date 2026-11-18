import { PrismaPg } from '@prisma/adapter-pg';

import { env } from '../config/env.js';
import { PrismaClient } from '../../generated/prisma/client.js';

let prismaClient: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (prismaClient) return prismaClient;

  const connectionString = env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL é necessária para utilizar o PostgreSQL. Configure a variável no ambiente.');
  }

  const adapter = new PrismaPg({ connectionString });
  prismaClient = new PrismaClient({ adapter });

  return prismaClient;
}

export async function disconnectPrisma(): Promise<void> {
  if (!prismaClient) return;

  const client = prismaClient;
  prismaClient = undefined;
  await client.$disconnect();
}
