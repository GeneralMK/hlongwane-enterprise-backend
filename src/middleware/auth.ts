import type Koa from "koa";

import { GraphQLError } from "graphql/error";

import prisma from "prisma";

import { supabaseAdmin } from "../lib/supabase.js";

import type {
  AuthenticatedUserClaims,
  AuthenticatedRole,
} from "../types/context.js";

import { logger } from "../utilities/index.js";

/**
 * Extract a Bearer token from the Authorization header.
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
 * Creates a consistent authentication error.
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
 * Resolve the authenticated Supabase user
 * into the Hlongwane Enterprise Prisma user.
 *
 * Authentication source:
 *
 * Supabase Auth
 *
 * Authorization source:
 *
 * User
 * -> UserRole
 * -> Role
 * -> RolePermission
 * -> Permission
 */
export async function authenticateAccessToken(
  token: string,
): Promise<AuthenticatedUserClaims> {
  if (!token?.trim()) {
    throw authenticationError(
      "Access token is required",
    );
  }

  /**
   * Validate the token with Supabase.
   *
   * Do not decode the JWT manually and
   * trust its contents.
   */
  const {
    data,
    error,
  } =
    await supabaseAdmin.auth
      .getUser(token);

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
   * authUserId contains the Supabase
   * Auth UUID.
   */
  const user =
    await prisma.user.findUnique({
      where: {
        authUserId:
          supabaseUser.id,
      },

      include: {
        adminProfile: true,

        userRoles: {
          where: {
            isActive: true,
            revokedAt: null,
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
   * Only active roles should be
   * exposed through the context.
   */
  const roles: AuthenticatedRole[] =
    user.userRoles
      .filter(
        (assignment) =>
          assignment.role
            .isActive,
      )
      .map(
        (assignment) => ({
          id:
            assignment.role.id,

          code:
            assignment.role.code,

          name:
            assignment.role.name,
        }),
      );

  /**
   * Flatten RolePermission records
   * into distinct permission codes.
   *
   * Example:
   *
   * products.create
   * products.update
   * orders.view
   * payments.refund
   */
  const permissions =
    Array.from(
      new Set(
        user.userRoles
          .filter(
            (assignment) =>
              assignment.role
                .isActive,
          )
          .flatMap(
            (assignment) =>
              assignment.role
                .permissions
                .filter(
                  (
                    rolePermission,
                  ) =>
                    rolePermission
                      .permission
                      .isActive,
                )
                .map(
                  (
                    rolePermission,
                  ) =>
                    rolePermission
                      .permission
                      .code,
                ),
          ),
      ),
    );

  const isSuperAdmin =
    roles.some(
      (role) =>
        role.code ===
        "SUPER_ADMIN",
    );

  /**
   * Any non-customer operational role
   * is considered an administrative user.
   *
   * This flag is convenience only.
   * Authorization must still use permissions.
   */
  const isAdmin =
    isSuperAdmin ||
    roles.some(
      (role) =>
        role.code !==
        "CUSTOMER",
    );

  /**
   * Update last login opportunistically.
   *
   * Authentication should not fail just
   * because this audit-style update fails.
   */
  try {
    await prisma.user.update({
      where: {
        id:
          user.id,
      },

      data: {
        lastLoginAt:
          new Date(),
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
              new Date(),
          },
        });
    }
  } catch (error) {
    logger(
      "AUTH_LAST_LOGIN_UPDATE_FAILED",
      {
        userId:
          user.id,

        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
    );
  }

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
            (role) =>
              role.code,
          ),

      permissionCount:
        authenticatedUser
          .permissions
          .length,
    },
  );

  return authenticatedUser;
}

/**
 * Authenticate a Koa request.
 *
 * Returns null when no token exists.
 *
 * An invalid token also resolves to null
 * so GraphQL public queries can continue.
 *
 * Protected resolvers will reject because
 * context.user will be null.
 */
export async function authenticateRequest(
  ctx: Koa.Context,
): Promise<AuthenticatedUserClaims | null> {
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
  } catch (error) {
    logger(
      "AUTH_REQUEST_FAILED",
      {
        method:
          ctx.method,

        path:
          ctx.path,

        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
    );

    return null;
  }
}

/**
 * Strict REST authentication middleware.
 *
 * Use this on REST endpoints that require
 * an authenticated user.
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
    ctx.status = 401;

    ctx.body = {
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
  } catch (error) {
    logger(
      "REST_AUTH_FAILED",
      {
        method:
          ctx.method,

        path:
          ctx.path,

        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
    );

    ctx.status = 401;

    ctx.body = {
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
 * Optional REST authentication.
 *
 * Useful for endpoints that work for both
 * authenticated and anonymous customers.
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

    await next();

    return;
  }

  try {
    ctx.state.user =
      await authenticateAccessToken(
        token,
      );

    ctx.state.token =
      token;
  } catch {
    ctx.state.user =
      null;
  }

  await next();
}

/**
 * Compatibility helper for your GraphQL
 * context creation.
 *
 * This replaces the old JWT-based
 * AuthMiddleware implementation.
 */
export async function AuthMiddleware(
  ctx: Koa.Context,
): Promise<AuthenticatedUserClaims | null> {
  return authenticateRequest(
    ctx,
  );
}