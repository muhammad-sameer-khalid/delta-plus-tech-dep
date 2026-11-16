import { PrismaClient } from '@prisma/client';

// Detect transient database connection drops (e.g., PostgreSQL restarting after OOM kill)
export function isTransientDbError(error: any): boolean {
  if (!error) return false;

  const code = String(error.code || '');
  const message = String(error.message || '').toLowerCase();

  // Prisma transient error codes:
  // P1001: Can't reach database server
  // P1002: Database server timed out
  // P1008: Operations timed out
  // P1017: Server has closed the connection
  // P2024: A timed-out occurred while acquiring a connection from the pool
  if (['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(code)) {
    return true;
  }

  // Network, connection, and PostgreSQL startup/recovery strings
  const transientIndicators = [
    'reach database server',
    'closed the connection',
    'terminated unexpectedly',
    'timed out',
    'timeout',
    'starting up',
    'in recovery mode',
    'shutting down',
    'administrator command',
    'econnreset',
    'econnrefused',
    'etimedout',
    'epipe',
    'pool',
  ];

  return transientIndicators.some((indicator) => message.includes(indicator));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 600
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      if (attempt > maxRetries || !isTransientDbError(error)) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[DB Auto-Retry] Transient error (${error.code || 'CONNECTION_INTERRUPTED'}). Retrying attempt ${attempt}/${maxRetries} after ${delay}ms...`
      );
      await sleep(delay);
    }
  }
}

// Global singleton pattern to prevent multiple Prisma connection pools in serverless/production
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const basePrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  });

// Always store on globalThis across all environments to prevent connection multiplication
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = basePrisma;
}

// Extend Prisma Client with automatic retry middleware across all models and operations
export const db = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        return withDbRetry(() => query(args));
      },
    },
  },
});
