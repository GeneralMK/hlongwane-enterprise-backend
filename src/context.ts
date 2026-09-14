
import type Koa from "koa";
import type { PrismaClient } from "@prisma/client";

export type AppContext = {
  // Koa ctx (useful for headers, ip, etc)
  ctx: Koa.Context;

  // Prisma
  prisma: PrismaClient;

  // Auth
  userId: string | null;
  role?: string;

  // Useful metadata
  ipAddress: string;
  userAgent?: string;
};