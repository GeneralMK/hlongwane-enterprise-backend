import prisma from "prisma";

export const findRoleByCode = (code: string) => prisma.role.findUnique({ where: { code } });
export const findUserByEmail = (email: string) => prisma.user.findUnique({ where: { email } });

export const createCustomer = (data: {
  authUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
}) =>
  prisma.user.create({
    data: {
      authUserId: data.authUserId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      userRoles: { create: { roleId: data.roleId, isActive: true } },
    },
    include: { userRoles: { include: { role: true } } },
  });
