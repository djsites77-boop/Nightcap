import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

function createPrismaClient() {
  return new PrismaClient({ adapter });
}

function isFreshClient(client: PrismaClient): boolean {
  // After `prisma generate` adds models, a cached global client can be stale
  // until the Next.js process restarts — detect and recreate.
  return typeof (client as { platformApiKey?: unknown }).platformApiKey !== "undefined";
}

const existing = globalForPrisma.prisma;
export const prisma =
  existing && isFreshClient(existing) ? existing : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
