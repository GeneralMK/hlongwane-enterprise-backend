import type { Context, Next } from "koa";

import { AuthMiddleware, type GqlContext } from "./auth";

export type RestAuthenticatedState = {
  userId?: string;
  adminUserId?: number;
  role?: string;
  tokenType?: "user" | "admin";
  authProvider?: "BEARER";
};

export type RestAuthenticatedContext = Context & {
  state: RestAuthenticatedState;
};

function setRestAuthenticationState(
  ctx: RestAuthenticatedContext,
  authentication: GqlContext,
): void {
  ctx.state.userId = authentication.userId || undefined;

  ctx.state.adminUserId = authentication.adminUserId || undefined;

  ctx.state.role = authentication.role;

  ctx.state.tokenType = authentication.tokenType;

  ctx.state.authProvider = authentication.tokenType ? "BEARER" : undefined;
}

/**
 * Accepts either a customer or administrator JWT.
 */
export async function RestAuthMiddleware(
  ctx: RestAuthenticatedContext,
  next: Next,
): Promise<void> {
  if (ctx.method === "OPTIONS") {
    await next();
    return;
  }

  const authentication = await AuthMiddleware(ctx);

  const isAuthenticated =
    Boolean(authentication.userId) || Boolean(authentication.adminUserId);

  if (!isAuthenticated) {
    ctx.status = 401;

    ctx.body = {
      success: false,
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Your session is invalid, missing or has expired",
    };

    return;
  }

  setRestAuthenticationState(ctx, authentication);

  await next();
}

/**
 * Accepts only a normal customer JWT.
 */
export async function RequireUserAuthMiddleware(
  ctx: RestAuthenticatedContext,
  next: Next,
): Promise<void> {
  if (ctx.method === "OPTIONS") {
    await next();
    return;
  }

  const authentication = await AuthMiddleware(ctx);

  if (!authentication.userId || authentication.tokenType === "admin") {
    ctx.status = 401;

    ctx.body = {
      success: false,
      ok: false,
      code: "USER_AUTHENTICATION_REQUIRED",
      message: "A valid customer account is required",
    };

    return;
  }

  setRestAuthenticationState(ctx, authentication);

  await next();
}

/**
 * Accepts only an administrator JWT.
 */
export async function RequireAdminAuthMiddleware(
  ctx: RestAuthenticatedContext,
  next: Next,
): Promise<void> {
  if (ctx.method === "OPTIONS") {
    await next();
    return;
  }

  const authentication = await AuthMiddleware(ctx);

  if (!authentication.adminUserId || authentication.tokenType !== "admin") {
    ctx.status = 401;

    ctx.body = {
      success: false,
      ok: false,
      code: "ADMIN_AUTHENTICATION_REQUIRED",
      message: "A valid administrator account is required",
    };

    return;
  }

  setRestAuthenticationState(ctx, authentication);

  await next();
}
