import { randomUUID } from "node:crypto";
import type {
  AuthenticatedRole,
  AuthenticatedUserClaims,
} from "../types/context.js";

export const generateUUID = () => randomUUID();

export const logger = (name: string, data?: unknown): void => {
  const payload = { timestamp: new Date().toISOString(), event: name, data };
  if (process.env.NODE_ENV === "production") {
    console.log(JSON.stringify(payload));
    return;
  }
  console.log(name, data ?? "");
};

export const errorLogger = (name: string, error: unknown): void => {
  if (error instanceof Error) {
    logger(name, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return;
  }
  logger(name, { error });
};

export const normalizePhoneNumber = (phone: string): string => {
  let normalized = phone.trim().replace(/[\s()-]/g, "");
  if (/^0\d{9}$/.test(normalized)) return `+27${normalized.slice(1)}`;
  if (/^27\d{9}$/.test(normalized)) return `+${normalized}`;
  if (!normalized.startsWith("+")) normalized = `+${normalized}`;
  return normalized;
};

export const extractBearerToken = (
  authorization?: string | null,
): string | null => {
  if (!authorization) return null;
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
};

const ADMIN_ROLE_CODES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "PRODUCT_MANAGER",
  "INVENTORY_MANAGER",
  "ORDER_MANAGER",
  "PAYMENT_MANAGER",
  "SUPPORT_AGENT",
]);

export const isAdminRole = (roles?: AuthenticatedRole[] | null): boolean =>
  roles?.some((role) => ADMIN_ROLE_CODES.has(role.code)) ?? false;

export const isSuperAdminRole = (roles?: AuthenticatedRole[] | null): boolean =>
  roles?.some((role) => role.code === "SUPER_ADMIN") ?? false;

export const hasPermission = (
  user: AuthenticatedUserClaims | null | undefined,
  code: string,
): boolean => !!user && (user.isSuperAdmin || user.permissions.includes(code));

export const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const pagination = (pageValue: unknown, limitValue: unknown) => {
  const page = Math.max(Number(pageValue) || 1, 1);
  const limit = Math.min(Math.max(Number(limitValue) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};
