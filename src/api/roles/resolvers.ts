import { GraphQLError } from "graphql/error";

import prisma from "prisma";

import * as service from "./service/index.js";

import { assertPermission } from "../../permissions/guard.js";

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

  return context.user;
}

const RoleResolvers = {
  Query: {
    /**
     * Returns all roles.
     *
     * Required permission:
     * admins.view
     *
     * RBAC action:
     * view:admins
     */
    roles: async (
      _: unknown,
      __: unknown,
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
          "view:admins",
      });

      return service.listRoles();
    },

    /**
     * Returns a single role.
     *
     * Required permission:
     * admins.view
     */
    role: async (
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

      await assertPermission({
        userId:
          authenticatedUser.id,

        action:
          "view:admins",
      });

      const role =
        await service.getRole(id);

      if (!role) {
        throw new GraphQLError(
          "Role not found",
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

      return role;
    },

    /**
     * Returns active role assignments
     * for a user.
     *
     * A user may view their own roles.
     *
     * Viewing another user's roles
     * requires admins.view.
     */
    userRoles: async (
      _: unknown,
      {
        userId,
      }: {
        userId: string;
      },
      context: Context,
    ) => {
      const authenticatedUser =
        requireAuthenticatedUser(
          context,
        );

      const isOwnAccount =
        authenticatedUser.id ===
        userId;

      if (!isOwnAccount) {
        await assertPermission({
          userId:
            authenticatedUser.id,

          action:
            "view:admins",
        });
      }

      return prisma.userRole.findMany({
        where: {
          userId,
          isActive: true,
          revokedAt: null,
        },

        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },

          assignedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },

        orderBy: {
          assignedAt: "desc",
        },
      });
    },
  },

  Mutation: {
    /**
     * Assigns a role to a user.
     *
     * Required permission:
     * admins.assign_roles
     *
     * RBAC action:
     * assign_roles:admins
     */
    assignUserRole: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          userId: string;
          roleId: string;
        };
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
          "assign_roles:admins",
      });

      return service.assignRole({
        userId:
          input.userId,

        roleId:
          input.roleId,

        actorUserId:
          authenticatedUser.id,
      });
    },

    /**
     * Revokes a user's role.
     *
     * Required permission:
     * admins.assign_roles
     *
     * The service should also protect
     * against revoking the last active
     * SUPER_ADMIN.
     */
    revokeUserRole: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          userId: string;
          roleId: string;
        };
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
          "assign_roles:admins",
      });

      return service.revokeRole({
        userId:
          input.userId,

        roleId:
          input.roleId,

        actorUserId:
          authenticatedUser.id,
      });
    },
  },
};

export default RoleResolvers;