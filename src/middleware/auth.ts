import type Koa from "koa";

import { GraphQLError } from "graphql/error";

import prisma from "../../prisma/index.js";

import { supabaseAdmin } from "../lib/supabase.js";

import type {
  AuthenticatedRole,
  AuthenticatedUserClaims,
} from "../types/context.js";

import { logger } from "../utilities/index.js";

/**
 * ============================================================
 * INTERNAL AUTH TYPES
 * ============================================================
 *
 * These describe only the Prisma relation shape required by
 * authentication.
 *
 * Keeping these types local prevents TypeScript from inferring
 * callback parameters as `any` in environments where generated
 * Prisma relation types are not resolved correctly.
 */

type AuthPermission = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

type AuthRolePermission = {
  permission: AuthPermission;
};

type AuthRoleRecord = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  permissions: AuthRolePermission[];
};

type AuthUserRoleAssignment = {
  isActive: boolean;
  revokedAt: Date | null;
  role: AuthRoleRecord;
};

/**
 * ============================================================
 * BEARER TOKEN
 * ============================================================
 */

/**
 * Extract a Supabase access token from an Authorization header.
 *
 * Expected:
 *
 * Authorization: Bearer <supabase-access-token>
 */
export function getBearerToken(
  authorization?: string,
): string | null {
  if (!authorization) {
    return null;
  }

  const trimmed =
    authorization.trim();

  if (!trimmed) {
    return null;
  }

  const match =
    trimmed.match(
      /^Bearer\s+(.+)$/i,
    );

  if (!match?.[1]) {
    return null;
  }

  const token =
    match[1].trim();

  return token || null;
}

/**
 * ============================================================
 * AUTHENTICATION ERROR
 * ============================================================
 */

function authenticationError(
  message = "Authentication required",
): GraphQLError {
  return new GraphQLError(
    message,
    {
      extensions: {
        code:
          "UNAUTHENTICATED",

        http: {
          status: 401,
        },
      },
    },
  );
}

/**
 * ============================================================
 * ROLE MAPPING
 * ============================================================
 */

function resolveRoles(
  assignments: AuthUserRoleAssignment[],
): AuthenticatedRole[] {
  return assignments
    .filter(
      (
        assignment:
          AuthUserRoleAssignment,
      ) =>
        assignment.isActive &&
        assignment.revokedAt ===
          null &&
        assignment.role
          .isActive,
    )
    .map(
      (
        assignment:
          AuthUserRoleAssignment,
      ): AuthenticatedRole => ({
        id:
          assignment.role.id,

        code:
          assignment.role.code,

        name:
          assignment.role.name,
      }),
    );
}

/**
 * ============================================================
 * PERMISSION MAPPING
 * ============================================================
 *
 * Database permission codes use:
 *
 * products.view
 * products.create
 * products.update
 * products.delete
 *
 * The application Action type uses:
 *
 * view:products
 * create:products
 * update:products
 * delete:products
 *
 * Context permissions contain DATABASE permission codes.
 */

function resolvePermissions(
  assignments: AuthUserRoleAssignment[],
): string[] {
  const permissionCodes =
    assignments
      .filter(
        (
          assignment:
            AuthUserRoleAssignment,
        ) =>
          assignment.isActive &&
          assignment.revokedAt ===
            null &&
          assignment.role
            .isActive,
      )
      .flatMap(
        (
          assignment:
            AuthUserRoleAssignment,
        ): string[] =>
          assignment.role
            .permissions
            .filter(
              (
                rolePermission:
                  AuthRolePermission,
              ) =>
                rolePermission
                  .permission
                  .isActive,
            )
            .map(
              (
                rolePermission:
                  AuthRolePermission,
              ): string =>
                rolePermission
                  .permission
                  .code,
            ),
      );

  /**
   * Explicit Set<string> is important.
   *
   * Without it some TypeScript/Prisma combinations can infer
   * Array.from(new Set(...)) as unknown[].
   */
  return Array.from(
    new Set<string>(
      permissionCodes,
    ),
  );
}

/**
 * ============================================================
 * ADMIN FLAGS
 * ============================================================
 */

function resolveIsSuperAdmin(
  roles: AuthenticatedRole[],
): boolean {
  return roles.some(
    (
      role:
        AuthenticatedRole,
    ) =>
      role.code ===
      "SUPER_ADMIN",
  );
}

/**
 * Convenience flag only.
 *
 * Authorization must still be performed through RBAC
 * permissions rather than this boolean.
 */
function resolveIsAdmin(
  roles: AuthenticatedRole[],
  isSuperAdmin: boolean,
): boolean {
  if (isSuperAdmin) {
    return true;
  }

  return roles.some(
    (
      role:
        AuthenticatedRole,
    ) =>
      role.code ===
      "ADMIN",
  );
}

/**
 * ============================================================
 * AUTHENTICATE SUPABASE ACCESS TOKEN
 * ============================================================
 *
 * Authentication:
 *
 * Supabase Auth
 *
 * Authorization:
 *
 * User
 *   ↓
 * UserRole
 *   ↓
 * Role
 *   ↓
 * RolePermission
 *   ↓
 * Permission
 */

export async function authenticateAccessToken(
  token: string,
): Promise<AuthenticatedUserClaims> {
  const normalizedToken =
    token?.trim();

  if (!normalizedToken) {
    throw authenticationError(
      "Access token is required",
    );
  }

  /**
   * Always validate the token against Supabase.
   *
   * Do not simply decode a JWT and trust its claims.
   */
  const {
    data,
    error,
  } =
    await supabaseAdmin.auth
      .getUser(
        normalizedToken,
      );

  if (
    error ||
    !data.user
  ) {
    logger(
      "SUPABASE_AUTH_FAILED",
      {
        message:
          error?.message ??
          "Supabase user not found",
      },
    );

    throw authenticationError(
      "Invalid or expired access token",
    );
  }

  const supabaseUser =
    data.user;

  /**
   * authUserId is the Supabase Auth UUID.
   */
  const user =
    await prisma.user.findUnique({
      where: {
        authUserId:
          supabaseUser.id,
      },

      include: {
        adminProfile:
          true,

        userRoles: {
          where: {
            isActive:
              true,

            revokedAt:
              null,
          },

          include: {
            role: {
              include: {
                permissions: {
                  where: {
                    permission: {
                      isActive:
                        true,
                    },
                  },

                  include: {
                    permission:
                      true,
                  },
                },
              },
            },
          },
        },
      },
    });

  /**
   * ==========================================================
   * USER VALIDATION
   * ==========================================================
   */

  if (!user) {
    logger(
      "AUTH_PRISMA_USER_NOT_FOUND",
      {
        authUserId:
          supabaseUser.id,

        email:
          supabaseUser.email ??
          null,
      },
    );

    throw authenticationError(
      "Application user account not found",
    );
  }

  if (!user.isActive) {
    logger(
      "AUTH_USER_INACTIVE",
      {
        userId:
          user.id,

        authUserId:
          user.authUserId,
      },
    );

    throw authenticationError(
      "User account is inactive",
    );
  }

  /**
   * ==========================================================
   * NORMALIZE PRISMA RBAC RELATIONS
   * ==========================================================
   *
   * Explicit structural typing here prevents Vercel/TypeScript
   * from assigning `any` to callback parameters.
   */

  const userRoleAssignments =
    user.userRoles as AuthUserRoleAssignment[];

  /**
   * ==========================================================
   * RESOLVE ROLES
   * ==========================================================
   */

  const roles:
    AuthenticatedRole[] =
    resolveRoles(
      userRoleAssignments,
    );

  /**
   * ==========================================================
   * RESOLVE PERMISSIONS
   * ==========================================================
   */

  const permissions:
    string[] =
    resolvePermissions(
      userRoleAssignments,
    );

  /**
   * ==========================================================
   * ADMIN FLAGS
   * ==========================================================
   */

  const isSuperAdmin =
    resolveIsSuperAdmin(
      roles,
    );

  const isAdmin =
    resolveIsAdmin(
      roles,
      isSuperAdmin,
    );

  /**
   * ==========================================================
   * LAST LOGIN
   * ==========================================================
   *
   * This is audit information.
   *
   * Authentication itself must not fail because updating
   * lastLoginAt failed.
   */

  const loginTimestamp =
    new Date();

  try {
    await prisma.user.update({
      where: {
        id:
          user.id,
      },

      data: {
        lastLoginAt:
          loginTimestamp,
      },
    });

    if (
      user.adminProfile
    ) {
      await prisma
        .adminProfile
        .update({
          where: {
            userId:
              user.id,
          },

          data: {
            lastLoginAt:
              loginTimestamp,
          },
        });
    }
  } catch (
    error
  ) {
    logger(
      "AUTH_LAST_LOGIN_UPDATE_FAILED",
      {
        userId:
          user.id,

        message:
          error instanceof
          Error
            ? error.message
            : String(
                error,
              ),
      },
    );
  }

  /**
   * ==========================================================
   * CONTEXT USER
   * ==========================================================
   */

  const authenticatedUser:
    AuthenticatedUserClaims = {
      id:
        user.id,

      authUserId:
        user.authUserId,

      email:
        user.email,

      firstName:
        user.firstName,

      lastName:
        user.lastName,

      phone:
        user.phone,

      isActive:
        user.isActive,

      roles,

      permissions,

      isAdmin,

      isSuperAdmin,
    };

  logger(
    "AUTH_SUCCESS",
    {
      userId:
        authenticatedUser.id,

      authUserId:
        authenticatedUser
          .authUserId,

      roles:
        authenticatedUser
          .roles
          .map(
            (
              role:
                AuthenticatedRole,
            ) =>
              role.code,
          ),

      permissionCount:
        authenticatedUser
          .permissions
          .length,

      isAdmin:
        authenticatedUser
          .isAdmin,

      isSuperAdmin:
        authenticatedUser
          .isSuperAdmin,
    },
  );

  return authenticatedUser;
}

/**
 * ============================================================
 * OPTIONAL GRAPHQL AUTHENTICATION
 * ============================================================
 *
 * GraphQL supports both public and protected queries.
 *
 * Therefore:
 *
 * Missing token -> null
 * Invalid token -> null
 *
 * Protected resolvers still reject requests when context.user
 * is null.
 */

export async function authenticateRequest(
  ctx: Koa.Context,
): Promise<
  AuthenticatedUserClaims |
  null
> {
  const token =
    getBearerToken(
      ctx.headers
        .authorization,
    );

  if (!token) {
    return null;
  }

  try {
    return await authenticateAccessToken(
      token,
    );
  } catch (
    error
  ) {
    logger(
      "AUTH_REQUEST_FAILED",
      {
        method:
          ctx.method,

        path:
          ctx.path,

        message:
          error instanceof
          Error
            ? error.message
            : String(
                error,
              ),
      },
    );

    return null;
  }
}

/**
 * ============================================================
 * REQUIRED REST AUTHENTICATION
 * ============================================================
 *
 * Use this middleware for protected REST endpoints.
 *
 * Example:
 *
 * router.get(
 *   "/me",
 *   requireAuthenticatedUser,
 *   meController,
 * );
 */

export async function requireAuthenticatedUser(
  ctx: Koa.Context,
  next: Koa.Next,
): Promise<void> {
  const token =
    getBearerToken(
      ctx.headers
        .authorization,
    );

  if (!token) {
    ctx.status =
      401;

    ctx.body = {
      success:
        false,

      error: {
        code:
          "UNAUTHENTICATED",

        message:
          "Authentication required",
      },
    };

    return;
  }

  try {
    const user =
      await authenticateAccessToken(
        token,
      );

    ctx.state.user =
      user;

    ctx.state.token =
      token;

    await next();
  } catch (
    error
  ) {
    logger(
      "REST_AUTH_FAILED",
      {
        method:
          ctx.method,

        path:
          ctx.path,

        message:
          error instanceof
          Error
            ? error.message
            : String(
                error,
              ),
      },
    );

    ctx.status =
      401;

    ctx.body = {
      success:
        false,

      error: {
        code:
          "UNAUTHENTICATED",

        message:
          "Invalid or expired access token",
      },
    };
  }
}

/**
 * ============================================================
 * OPTIONAL REST AUTHENTICATION
 * ============================================================
 *
 * Useful for endpoints that support:
 *
 * - anonymous visitors
 * - authenticated customers
 *
 * Example:
 *
 * public catalogue endpoints that can provide personalised
 * information when a valid user exists.
 */

export async function optionalAuthenticatedUser(
  ctx: Koa.Context,
  next: Koa.Next,
): Promise<void> {
  const token =
    getBearerToken(
      ctx.headers
        .authorization,
    );

  if (!token) {
    ctx.state.user =
      null;

    ctx.state.token =
      null;

    await next();

    return;
  }

  try {
    const user =
      await authenticateAccessToken(
        token,
      );

    ctx.state.user =
      user;

    ctx.state.token =
      token;
  } catch (
    error
  ) {
    logger(
      "OPTIONAL_REST_AUTH_FAILED",
      {
        method:
          ctx.method,

        path:
          ctx.path,

        message:
          error instanceof
          Error
            ? error.message
            : String(
                error,
              ),
      },
    );

    ctx.state.user =
      null;

    ctx.state.token =
      null;
  }

  await next();
}

/**
 * ============================================================
 * GRAPHQL COMPATIBILITY HELPER
 * ============================================================
 *
 * This exists for existing code that still calls:
 *
 * AuthMiddleware(ctx)
 *
 * It does NOT implement the previous local JWT architecture.
 *
 * Authentication continues through Supabase.
 */

export async function AuthMiddleware(
  ctx: Koa.Context,
): Promise<
  AuthenticatedUserClaims |
  null
> {
  return authenticateRequest(
    ctx,
  );
}