import { GraphQLError } from "graphql/error";

import * as service from "./service/index.js";

import { assertPermission } from "../../permissions/guard.js";

import type { Context } from "../../types/context.js";

type FindAuditLogsInput = {
  actorUserId?: string;
  entityType?: string;
  action?: string;
  page?: number;
  limit?: number;
};

function requireAuthenticatedUser(context: Context) {
  if (!context.user) {
    throw new GraphQLError(
      "Authentication required",
      {
        extensions: {
          code: "UNAUTHENTICATED",
          http: {
            status: 401,
          },
        },
      },
    );
  }

  if (!context.user.isActive) {
    throw new GraphQLError(
      "User account is inactive",
      {
        extensions: {
          code: "FORBIDDEN",
          http: {
            status: 403,
          },
        },
      },
    );
  }

  return context.user;
}

function normalizePagination(
  page?: number,
  limit?: number,
) {
  const normalizedPage =
    Number.isInteger(page) &&
    Number(page) > 0
      ? Number(page)
      : 1;

  const normalizedLimit =
    Number.isInteger(limit) &&
    Number(limit) > 0
      ? Math.min(Number(limit), 100)
      : 20;

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    skip:
      (normalizedPage - 1) *
      normalizedLimit,
    take: normalizedLimit,
  };
}

const AuditResolvers = {
  Query: {
    auditLogs: async (
      _: unknown,
      {
        input,
      }: {
        input?: FindAuditLogsInput;
      },
      context: Context,
    ) => {
      const user =
        requireAuthenticatedUser(
          context,
        );

      await assertPermission({
        userId: user.id,
        action: "view:audit",
      });

      const paging =
        normalizePagination(
          input?.page,
          input?.limit,
        );

      const [items, total] =
        await service.listAuditLogs({
          actorUserId:
            input?.actorUserId,

          entityType:
            input?.entityType,

          action:
            input?.action,

          skip:
            paging.skip,

          take:
            paging.take,
        });

      return {
        auditLogs: items,

        total,

        page:
          paging.page,

        limit:
          paging.limit,

        totalPages:
          total === 0
            ? 0
            : Math.ceil(
                total /
                  paging.limit,
              ),
      };
    },
  },
};

export default AuditResolvers;