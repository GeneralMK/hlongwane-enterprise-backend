import prisma from "prisma";
export const findRoles = () => prisma.role.findMany({
  orderBy: { name: "asc" },
  include: { permissions: { include: { permission: true } } },
});
export const findRoleById = (id: string) => prisma.role.findUnique({
  where: { id },
  include: { permissions: { include: { permission: true } } },
});
export const findUserRole = (userId: string, roleId: string) =>
  prisma.userRole.findUnique({
    where: { userId_roleId: { userId, roleId } },
    include: { role: true },
  });
