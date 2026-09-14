import prisma from "prisma";

export const findUserByAuthUserId = async (authUserId: string) => {
  return prisma.user.findUnique({
    where: {
      authUserId,
    },
  });
};

/**
 * Extracts a Bearer access token from an Authorization header.
 *
 * Expected:
 * Authorization: Bearer <token>
 */
export const extractBearerToken = (
  authorization?: string | null,
): string | null => {
  if (!authorization) {
    return null;
  }

  const match = authorization.match(
    /^Bearer\s+(.+)$/i,
  );

  const token = match?.[1]?.trim();

  return token || null;
};

export const findUserWithAccess = async (userId: string) => {
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
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });
};
