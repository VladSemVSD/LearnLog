import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local.");
  }
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

let cached: PrismaClient | undefined = globalThis.prisma;

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_t, prop, receiver) {
    if (!cached) {
      cached = createPrismaClient();
      if (process.env.NODE_ENV !== "production") {
        globalThis.prisma = cached;
      }
    }
    return Reflect.get(cached, prop, receiver);
  },
}) as PrismaClient;
