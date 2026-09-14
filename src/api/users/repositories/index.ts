import prisma from "../../../../prisma/index.js";

/**
 * Derive repository input types directly from the generated
 * Prisma client.
 *
 * This avoids depending on Prisma.UserWhereInput /
 * Prisma.UserUpdateInput namespace exports, which can differ
 * between generated client versions/environments.
 */

type UserFindManyArgs = NonNullable<Parameters<typeof prisma.user.findMany>[0]>;

type UserWhereInput = NonNullable<UserFindManyArgs["where"]>;

type UserUpdateArgs = NonNullable<Parameters<typeof prisma.user.update>[0]>;

type UserUpdateInput = UserUpdateArgs["data"];

export type FindUsersParams = {
  search?: string;
  skip: number;
  take: number;
};

/**
 * Find users with optional case-insensitive search.
 */
export const findUsers = (params: FindUsersParams) => {
  const search = params.search?.trim();

  const where: UserWhereInput = search
    ? {
        OR: [
          {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            firstName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      }
    : {};

  return Promise.all([
    prisma.user.findMany({
      where,

      skip: params.skip,

      take: params.take,

      include: {
        adminProfile: true,

        userRoles: {
          where: {
            isActive: true,

            revokedAt: null,
          },

          include: {
            role: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.user.count({
      where,
    }),
  ]);
};

/**
 * Find a single user with the relations required by
 * profile/admin/RBAC screens.
 */
export const findUserById = (id: string) =>
  prisma.user.findUnique({
    where: {
      id,
    },

    include: {
      adminProfile: true,

      addresses: true,

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
                    isActive: true,
                  },
                },

                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

/**
 * Update a user.
 */
export const updateUser = (id: string, data: UserUpdateInput) =>
  prisma.user.update({
    where: {
      id,
    },

    data,
  });
