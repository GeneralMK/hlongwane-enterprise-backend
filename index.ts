import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { ApolloServer } from "@apollo/server";

import { ApolloServerPluginLandingPageDisabled } from "@apollo/server/plugin/disabled";

import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";

import { koaMiddleware } from "@as-integrations/koa";

import cors from "@koa/cors";

import Router from "@koa/router";

import Koa from "koa";

import { koaBody } from "koa-body";

/**
 * ============================================================
 * GRAPHQL
 * ============================================================
 */

import schema from "./graphql/index.js";

/**
 * ============================================================
 * DATABASE
 * ============================================================
 */

import prisma from "./prisma/index.js";

/**
 * ============================================================
 * REST API ROUTES
 * ============================================================
 */

import auditRouter from "./src/api/audit/routes.js";

import authRouter from "./src/api/auth/routes.js";

import brandsRouter from "./src/api/brands/routes.js";

import cartsRouter from "./src/api/carts/routes.js";

import categoriesRouter from "./src/api/categories/routes.js";

import fileUploadRouter from "./src/api/file-upload/routes.js";

import inventoryRouter from "./src/api/inventory/routes.js";

import notificationsRouter from "./src/api/notifications/routes.js";

import ordersRouter from "./src/api/orders/routes.js";

import paymentsRouter from "./src/api/payments/routes.js";

import productVariantsRouter from "./src/api/product-variants/routes.js";

import productsRouter from "./src/api/products/routes.js";

import returnsRouter from "./src/api/returns/routes.js";

import rolesRouter from "./src/api/roles/routes.js";

import shipmentsRouter from "./src/api/shipments/routes.js";

import usersRouter from "./src/api/users/routes.js";

/**
 * ============================================================
 * AUTHENTICATION
 * ============================================================
 */

import { authenticateRequest, getBearerToken } from "./src/middleware/auth.js";

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

import type { Context } from "./src/types/context.js";

/**
 * ============================================================
 * UTILITIES
 * ============================================================
 */

import { logger } from "./src/utilities/index.js";

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

/**
 * Multipart files are temporarily written to disk before the
 * file-upload service moves them into Supabase Storage.
 */
function ensureUploadDirectory(): string {
  const uploadDirectory = path.resolve(process.cwd(), "uploads");

  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });

  return uploadDirectory;
}

/**
 * Normalize configured frontend origins.
 */
function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

/**
 * ============================================================
 * BOOTSTRAP
 * ============================================================
 */

async function bootstrap(): Promise<void> {
  const app = new Koa();

  const httpServer = http.createServer(app.callback());

  const healthRouter = new Router();

  const graphqlRouter = new Router();

  /**
   * All REST APIs live beneath:
   *
   * /api/v1
   */
  const apiV1Router = new Router({
    prefix: "/api/v1",
  });

  const port = Number(process.env.PORT ?? 4000);

  const host = process.env.HOST?.trim() || `http://localhost:${port}`;

  const isProduction = process.env.NODE_ENV === "production";

  const uploadDirectory = ensureUploadDirectory();

  /**
   * ==========================================================
   * GLOBAL ERROR HANDLER
   * ==========================================================
   */

  app.use(async (context, next) => {
    try {
      await next();
    } catch (error: any) {
      const status = Number(
        error?.status ??
          error?.statusCode ??
          error?.extensions?.http?.status ??
          500,
      );

      const code =
        error?.code ??
        error?.extensions?.code ??
        (status === 401
          ? "UNAUTHENTICATED"
          : status === 403
            ? "FORBIDDEN"
            : status === 404
              ? "NOT_FOUND"
              : status >= 500
                ? "INTERNAL_SERVER_ERROR"
                : "BAD_REQUEST");

      logger("HTTP_ERROR", {
        requestId: context.state.requestId,

        method: context.method,

        path: context.path,

        status,

        code,

        message: error instanceof Error ? error.message : String(error),

        stack:
          status >= 500 && error instanceof Error ? error.stack : undefined,
      });

      context.status = status;

      context.body = {
        success: false,

        error: {
          code,

          message:
            status >= 500 && isProduction
              ? "An unexpected error occurred."
              : (error?.message ?? "Request failed"),

          requestId: context.state.requestId,
        },
      };

      context.app.emit("error", error, context);
    }
  });

  /**
   * ==========================================================
   * REQUEST CONTEXT
   * ==========================================================
   */

  app.use(async (context, next) => {
    const incomingRequestId = context.get("x-request-id");

    context.state.requestId = incomingRequestId || randomUUID();

    context.set("x-request-id", context.state.requestId);

    await next();
  });

  /**
   * ==========================================================
   * APPLICATION ERROR EVENT
   * ==========================================================
   */

  app.on("error", (error, context) => {
    logger("KOA_APPLICATION_ERROR", {
      requestId: context?.state?.requestId,

      error: error instanceof Error ? error.message : String(error),

      stack: error instanceof Error ? error.stack : undefined,

      method: context?.method,

      path: context?.path,
    });
  });

  /**
   * ==========================================================
   * CORS
   * ==========================================================
   */

  const configuredOrigins = [
    process.env.FRONTEND_URL,

    process.env.ADMIN_FRONTEND_URL,

    process.env.ADDITIONAL_FRONTEND_URL,
  ]
    .filter(
      (value): value is string =>
        typeof value === "string" && Boolean(value.trim()),
    )
    .map(normalizeOrigin);

  const developmentOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",

    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:5173",
  ];

  const allowedOrigins = new Set<string>([
    ...developmentOrigins,

    ...configuredOrigins,
  ]);

  function isAllowedOrigin(origin: string): boolean {
    const normalized = normalizeOrigin(origin);

    if (allowedOrigins.has(normalized)) {
      return true;
    }

    /**
     * Permit development ngrok URLs.
     */
    if (
      !isProduction &&
      /^https:\/\/[a-z0-9-]+\.ngrok-free\.app$/i.test(normalized)
    ) {
      return true;
    }

    return false;
  }

  app.use(
    cors({
      origin: (context) => {
        const requestOrigin = context.get("Origin");

        /**
         * Non-browser clients such as Postman
         * may not send Origin.
         */
        if (!requestOrigin) {
          return "*";
        }

        if (isAllowedOrigin(requestOrigin)) {
          return normalizeOrigin(requestOrigin);
        }

        logger("CORS_ORIGIN_BLOCKED", {
          origin: requestOrigin,

          method: context.method,

          path: context.path,
        });

        return "";
      },

      credentials: true,

      allowMethods: [
        "GET",
        "HEAD",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
      ],

      allowHeaders: [
        "Accept",
        "Content-Type",
        "Authorization",

        "X-Requested-With",
        "X-Request-Id",

        /**
         * Payment providers.
         */
        "x-paystack-signature",
        "x-payflex-signature",
        "x-payfast-signature",
        "x-ozow-signature",

        /**
         * Development tunnelling.
         */
        "ngrok-skip-browser-warning",
      ],

      exposeHeaders: ["Content-Length", "Content-Type", "X-Request-Id"],

      keepHeadersOnError: true,

      maxAge: 86400,
    }),
  );

  /**
   * ==========================================================
   * REQUEST BODY / MULTIPART
   * ==========================================================
   *
   * File uploads are temporarily stored locally.
   *
   * The Hlongwane file-upload service then sends the file
   * into Supabase Storage.
   */

  app.use(
    koaBody({
      includeUnparsed: true,

      multipart: true,

      json: true,

      text: true,

      urlencoded: true,

      formidable: {
        uploadDir: uploadDirectory,

        keepExtensions: true,

        multiples: true,

        maxFileSize:
          Number(process.env.MAX_DOCUMENT_UPLOAD_SIZE) || 20 * 1024 * 1024,

        maxFieldsSize: 20 * 1024 * 1024,

        allowEmptyFiles: false,

        minFileSize: 1,
      },

      onError: (error, context) => {
        logger("KOA_BODY_ERROR", {
          requestId: context.state.requestId,

          message: error instanceof Error ? error.message : String(error),

          method: context.method,

          path: context.path,
        });

        context.throw(
          400,

          error instanceof Error
            ? error.message
            : "Unable to parse request body",
        );
      },
    }),
  );

  /**
   * ==========================================================
   * REQUEST LOGGING
   * ==========================================================
   */

  app.use(async (context, next) => {
    const startedAt = Date.now();

    try {
      await next();
    } finally {
      logger("HTTP_REQUEST", {
        requestId: context.state.requestId,

        method: context.method,

        path: context.path,

        status: context.status,

        durationMs: Date.now() - startedAt,

        userId: context.state.user?.id ?? null,
      });
    }
  });

  /**
   * ==========================================================
   * HEALTH
   * ==========================================================
   */

  healthRouter.get(
    "/health",

    async (context) => {
      try {
        await prisma.$queryRaw`SELECT 1`;

        context.status = 200;

        context.body = {
          success: true,

          service: "hlongwane-enterprise-backend",

          database: "connected",

          storage: "supabase",

          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger("HEALTH_CHECK_FAILED", {
          message: error instanceof Error ? error.message : String(error),
        });

        context.status = 503;

        context.body = {
          success: false,

          service: "hlongwane-enterprise-backend",

          database: "disconnected",

          timestamp: new Date().toISOString(),
        };
      }
    },
  );

  /**
   * ==========================================================
   * REST API V1
   * ==========================================================
   *
   * Each child router already contains its own module prefix.
   *
   * Example:
   *
   * brandsRouter:
   *   /brands
   *
   * Mounted here:
   *   /api/v1/brands
   */

  apiV1Router.use(authRouter.routes(), authRouter.allowedMethods());

  apiV1Router.use(usersRouter.routes(), usersRouter.allowedMethods());

  apiV1Router.use(rolesRouter.routes(), rolesRouter.allowedMethods());

  apiV1Router.use(brandsRouter.routes(), brandsRouter.allowedMethods());

  apiV1Router.use(categoriesRouter.routes(), categoriesRouter.allowedMethods());

  apiV1Router.use(productsRouter.routes(), productsRouter.allowedMethods());

  apiV1Router.use(
    productVariantsRouter.routes(),
    productVariantsRouter.allowedMethods(),
  );

  apiV1Router.use(inventoryRouter.routes(), inventoryRouter.allowedMethods());

  apiV1Router.use(cartsRouter.routes(), cartsRouter.allowedMethods());

  apiV1Router.use(ordersRouter.routes(), ordersRouter.allowedMethods());

  apiV1Router.use(paymentsRouter.routes(), paymentsRouter.allowedMethods());

  apiV1Router.use(shipmentsRouter.routes(), shipmentsRouter.allowedMethods());

  apiV1Router.use(returnsRouter.routes(), returnsRouter.allowedMethods());

  apiV1Router.use(
    notificationsRouter.routes(),
    notificationsRouter.allowedMethods(),
  );

  apiV1Router.use(fileUploadRouter.routes(), fileUploadRouter.allowedMethods());

  apiV1Router.use(auditRouter.routes(), auditRouter.allowedMethods());

  /**
   * ==========================================================
   * GRAPHQL SERVER
   * ==========================================================
   *
   * GraphQL remains available while your resolver/schema layer
   * is still part of the platform.
   *
   * Authentication:
   * Supabase
   *
   * Authorization:
   * Prisma RBAC
   */

  const plugins = [
    ApolloServerPluginDrainHttpServer({
      httpServer,
    }),
  ];

  if (isProduction) {
    plugins.push(ApolloServerPluginLandingPageDisabled());
  }

  const apolloServer = new ApolloServer<Context>({
    schema,

    plugins,

    introspection:
      !isProduction || process.env.GRAPHQL_INTROSPECTION === "true",
  });

  await apolloServer.start();

  graphqlRouter.all(
    "/graphql",

    koaMiddleware(apolloServer, {
      context: async ({ ctx }): Promise<Context> => {
        /**
         * authenticateRequest() validates
         * the Supabase access token and
         * resolves the Prisma user,
         * roles and permissions.
         */
        const user = await authenticateRequest(ctx);

        const token = getBearerToken(ctx.headers.authorization);

        logger("GRAPHQL_CONTEXT", {
          requestId: ctx.state.requestId,

          authenticated: Boolean(user),

          userId: user?.id ?? null,

          roles: user?.roles.map((role) => role.code) ?? [],

          permissionCount: user?.permissions.length ?? 0,

          isAdmin: user?.isAdmin ?? false,

          isSuperAdmin: user?.isSuperAdmin ?? false,
        });

        return {
          prisma,

          user,

          token: token ?? undefined,

          requestId: String(ctx.state.requestId ?? randomUUID()),

          sessionId: ctx.state.sessionId,

          req: ctx.req,

          res: ctx.res,
        };
      },
    }),
  );

  /**
   * ==========================================================
   * MOUNT HEALTH
   * ==========================================================
   */

  app.use(healthRouter.routes());

  app.use(
    healthRouter.allowedMethods({
      throw: true,
    }),
  );

  /**
   * ==========================================================
   * MOUNT REST V1
   * ==========================================================
   */

  app.use(apiV1Router.routes());

  app.use(
    apiV1Router.allowedMethods({
      throw: true,
    }),
  );

  /**
   * ==========================================================
   * MOUNT GRAPHQL
   * ==========================================================
   */

  app.use(graphqlRouter.routes());

  app.use(
    graphqlRouter.allowedMethods({
      throw: true,
    }),
  );

  /**
   * ==========================================================
   * 404
   * ==========================================================
   */

  app.use(async (context) => {
    if (context.status === 404) {
      context.body = {
        success: false,

        error: {
          code: "ROUTE_NOT_FOUND",

          message: `Route ${context.method} ${context.path} was not found.`,

          requestId: context.state.requestId,
        },
      };
    }
  });

  /**
   * ==========================================================
   * SERVER STARTUP
   * ==========================================================
   */

  await new Promise<void>((resolve) => {
    httpServer.listen(
      port,

      () => {
        console.log(`
============================================================

 HLONGWANE ENTERPRISE
 Device Commerce Platform

============================================================

Environment:
  ${process.env.NODE_ENV || "development"}

Server:
  ${host}

REST API:
  ${host}/api/v1

Authentication:
  ${host}/api/v1/auth

Users:
  ${host}/api/v1/users

Roles:
  ${host}/api/v1/roles

Brands:
  ${host}/api/v1/brands

Categories:
  ${host}/api/v1/categories

Products:
  ${host}/api/v1/products

Product Variants:
  ${host}/api/v1/product-variants

Inventory:
  ${host}/api/v1/inventory

Cart:
  ${host}/api/v1/carts

Orders:
  ${host}/api/v1/orders

Payments:
  ${host}/api/v1/payments

Shipments:
  ${host}/api/v1/shipments

Returns:
  ${host}/api/v1/returns

Notifications:
  ${host}/api/v1/notifications

Files:
  ${host}/api/v1/files

Audit:
  ${host}/api/v1/audit

GraphQL:
  ${host}/graphql

Health:
  ${host}/health

Storage:
  Supabase Storage

Temporary Upload Directory:
  ${uploadDirectory}

============================================================

Hlongwane Enterprise backend is ready.

============================================================
`);

        resolve();
      },
    );
  });

  /**
   * ==========================================================
   * GRACEFUL SHUTDOWN
   * ==========================================================
   */

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down Hlongwane Enterprise...`);

    try {
      await apolloServer.stop();

      await prisma.$disconnect();

      httpServer.close(() => {
        console.log("Hlongwane Enterprise backend stopped.");

        process.exit(0);
      });
    } catch (error) {
      console.error("Shutdown failed:", error);

      process.exit(1);
    }
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

/**
 * ============================================================
 * START APPLICATION
 * ============================================================
 */

bootstrap().catch(async (error) => {
  console.error("Failed to start Hlongwane Enterprise backend:", error);

  try {
    await prisma.$disconnect();
  } catch {
    // Ignore disconnect failure during startup failure.
  }

  process.exit(1);
});
