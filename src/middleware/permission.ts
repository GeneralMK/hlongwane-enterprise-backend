import type Koa from "koa";

import {
  requireAuthenticatedUser,
} from "./auth.js";

import {
  hasPermission,
  isValidAction,
  type Action,
} from "../permissions/rbac.js";

import type {
  AuthenticatedUserClaims,
} from "../types/context.js";

/**
 * Re-export the authentication middleware
 * so REST routes can import authentication
 * and authorization from one place.
 */
export {
  requireAuthenticatedUser,
};

/**
 * Safely get the authenticated application
 * user attached by requireAuthenticatedUser().
 */
function getAuthenticatedUser(
  ctx: Koa.Context,
): AuthenticatedUserClaims | null {
  const user =
    ctx.state.user as
      | AuthenticatedUserClaims
      | undefined
      | null;

  return user ?? null;
}

/**
 * REST permission middleware.
 *
 * Example:
 *
 * router.get(
 *   "/",
 *   requireAuthenticatedUser,
 *   requirePermission("view:audit"),
 *   controller,
 * );
 *
 * RBAC converts:
 *
 * view:audit
 *
 * to:
 *
 * audit.view
 */
export function requirePermission(
  action: Action,
): Koa.Middleware {
  return async (
    ctx: Koa.Context,
    next: Koa.Next,
  ): Promise<void> => {
    const user =
      getAuthenticatedUser(
        ctx,
      );

    if (!user) {
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

    /**
     * Defensive runtime validation.
     *
     * TypeScript catches invalid Action values
     * during development, but this also protects
     * the runtime path.
     */
    if (
      !isValidAction(action)
    ) {
      ctx.status = 500;

      ctx.body = {
        error: {
          code:
            "INVALID_PERMISSION_ACTION",

          message:
            `Invalid permission action: ${action}`,
        },
      };

      return;
    }

    const permitted =
      await hasPermission({
        userId:
          user.id,

        action,
      });

    if (!permitted) {
      ctx.status = 403;

      ctx.body = {
        error: {
          code:
            "FORBIDDEN",

          message:
            "You do not have permission to perform this action.",
        },
      };

      return;
    }

    await next();
  };
}

/**
 * Optional helper when a route needs
 * authentication but no permission.
 */
export function requireUser():
  Koa.Middleware {
  return async (
    ctx: Koa.Context,
    next: Koa.Next,
  ): Promise<void> => {
    const user =
      getAuthenticatedUser(
        ctx,
      );

    if (!user) {
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

    await next();
  };
}