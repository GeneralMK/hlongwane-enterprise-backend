import { GraphQLError } from "graphql/error";

import * as service from "./service/index.js";

import type { Context } from "../../types/context.js";

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
      ? Math.min(
          Number(limit),
          100,
        )
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

const NotificationResolvers = {
  Query: {
    /**
     * Returns notifications for the
     * authenticated user only.
     *
     * No admin permission is required,
     * because this query is scoped to
     * context.user.id.
     */
    myNotifications: async (
      _: unknown,
      {
        page,
        limit,
      }: {
        page?: number;
        limit?: number;
      },
      context: Context,
    ) => {
      const user =
        requireAuthenticatedUser(
          context,
        );

      const paging =
        normalizePagination(
          page,
          limit,
        );

      const result =
        await service
          .listMyNotifications({
            userId:
              user.id,

            skip:
              paging.skip,

            take:
              paging.take,
          });

      return {
        notifications:
          result.items,

        total:
          result.total,

        page:
          paging.page,

        limit:
          paging.limit,

        totalPages:
          result.total === 0
            ? 0
            : Math.ceil(
                result.total /
                  paging.limit,
              ),
      };
    },
  },
};

export default NotificationResolvers;