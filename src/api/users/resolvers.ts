import { GraphQLError } from "graphql/error";

import * as service from "./service/index.js";

import { assertPermission } from "../../permissions/guard.js";

import type { Context } from "../../types/context.js";

type FindUsersInput = {
  search?: string;
  page?: number;
  limit?: number;
};

type UpdateUserInput = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  isActive?: boolean;
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

const UserResolvers = {
  Query: {
    /**
     * Get all users.
     *
     * Required permission:
     * users.view
     *
     * RBAC Action:
     * view:users
     */
    users: async (
      _: unknown,
      {
        input,
      }: {
        input?: FindUsersInput;
      },
      context: Context,
    ) => {
      const authenticatedUser =
        requireAuthenticatedUser(
          context,
        );

      await assertPermission({
        userId:
          authenticatedUser.id,

        action:
          "view:users",
      });

      const paging =
        normalizePagination(
          input?.page,
          input?.limit,
        );

      const result =
        await service.listUsers({
          search:
            input?.search?.trim() ||
            undefined,

          skip:
            paging.skip,

          take:
            paging.take,
        });

      return {
        users:
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

    /**
     * Get a single user.
     *
     * Users may access their own
     * profile without users.view.
     *
     * Accessing another user's
     * profile requires users.view.
     */
    user: async (
      _: unknown,
      {
        id,
      }: {
        id: string;
      },
      context: Context,
    ) => {
      const authenticatedUser =
        requireAuthenticatedUser(
          context,
        );

      const isOwnProfile =
        authenticatedUser.id === id;

      if (!isOwnProfile) {
        await assertPermission({
          userId:
            authenticatedUser.id,

          action:
            "view:users",
        });
      }

      const user =
        await service.getUser(id);

      if (!user) {
        throw new GraphQLError(
          "User not found",
          {
            extensions: {
              code: "NOT_FOUND",
              http: {
                status: 404,
              },
            },
          },
        );
      }

      return user;
    },
  },

  Mutation: {
    /**
     * Update user.
     *
     * An authenticated user may
     * update their own basic profile.
     *
     * Updating another user requires:
     * users.update
     *
     * RBAC Action:
     * update:users
     */
    updateUser: async (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: UpdateUserInput;
      },
      context: Context,
    ) => {
      const authenticatedUser =
        requireAuthenticatedUser(
          context,
        );

      const isOwnProfile =
        authenticatedUser.id === id;

      /*
       * Updating someone else's
       * account requires users.update.
       */
      if (!isOwnProfile) {
        await assertPermission({
          userId:
            authenticatedUser.id,

          action:
            "update:users",
        });
      }

      /*
       * Account activation/deactivation
       * is an administrative operation.
       *
       * Even users modifying themselves
       * cannot modify isActive unless
       * they have users.update.
       */
      if (
        input.isActive !==
        undefined
      ) {
        await assertPermission({
          userId:
            authenticatedUser.id,

          action:
            "update:users",
        });
      }

      return service.updateUser(
        id,
        {
          firstName:
            input.firstName,

          lastName:
            input.lastName,

          phone:
            input.phone,

          isActive:
            input.isActive,
        },
      );
    },
  },
};

export default UserResolvers;