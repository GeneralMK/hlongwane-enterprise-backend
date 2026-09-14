import prisma from "prisma";
import type { Prisma } from "@prisma/client";

export const findUsers = (params: { search?: string; skip: number; take: number }) => {
  const where: Prisma.UserWhereInput = params.search ? {
    OR: [
      { email: { contains: params.search, mode: "insensitive" } },
      { firstName: { contains: params.search, mode: "insensitive" } },
      { lastName: { contains: params.search, mode: "insensitive" } },
    ],
  } : {};

  return Promise.all([
    prisma.user.findMany({
      where,
      skip: params.skip,
      take: params.take,
      include: {
        adminProfile: true,
        userRoles: {
          where: { isActive: true, revokedAt: null },
          include: { role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);
};

export const findUserById = (id: string) =>
  prisma.user.findUnique({
    where: { id },
    include: {
      adminProfile: true,
      addresses: true,
      userRoles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });

export const updateUser = (id: string, data: Prisma.UserUpdateInput) =>
  prisma.user.update({ where: { id }, data });
