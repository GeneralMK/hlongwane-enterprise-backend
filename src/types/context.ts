import type { PrismaClient } from "@prisma/client";
import type {
  IncomingMessage,
  ServerResponse,
} from "node:http";

/**
 * Active role assigned to the authenticated user.
 *
 * User -> UserRole -> Role
 */
export interface AuthenticatedRole {
  id: string;
  code: string;
  name: string;
}

/**
 * Normalized authenticated Hlongwane Enterprise user.
 *
 * id         = Prisma User.id
 * authUserId = Supabase Auth user UUID
 *
 * Roles and permissions are resolved from:
 *
 * User
 * -> UserRole
 * -> Role
 * -> RolePermission
 * -> Permission
 */
export interface AuthenticatedUserClaims {
  id: string;

  authUserId: string;

  email: string;

  firstName: string;

  lastName: string;

  phone?: string | null;

  isActive: boolean;

  roles: AuthenticatedRole[];

  permissions: string[];

  isAdmin: boolean;

  isSuperAdmin: boolean;
}

/**
 * Context used by application services.
 */
export interface ServiceContext {
  requestId: string;

  userId?: string;

  authUserId?: string;

  sessionId?: string;

  traceId?: string;

  metadata?: Record<string, unknown>;
}

/**
 * Apollo GraphQL context.
 */
export interface Context {
  prisma: PrismaClient;

  user: AuthenticatedUserClaims | null;

  token?: string;

  requestId: string;

  sessionId?: string;

  req: IncomingMessage;

  res: ServerResponse;
}