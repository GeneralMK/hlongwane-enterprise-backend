import prisma from "prisma";

export const findUserByAuthUserId =
  async (
    authUserId: string,
  ) => {
    return prisma.user.findUnique({
      where: {
        authUserId,
      },
    });
  };

export const findUserWithAccess =
  async (
    userId: string,
  ) => {
    return prisma.user.findUnique({
      where: {
        id: userId,
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
                      isActive: true,
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
  };