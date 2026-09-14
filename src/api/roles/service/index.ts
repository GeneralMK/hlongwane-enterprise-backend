import prisma from "prisma";

import * as repo from "../repositories/index.js";
import { notFound, badRequest } from "src/types/app-errors.js";

export const listRoles = repo.findRoles;

export const getRole = async (id: string) => {
  const role = await repo.findRoleById(id);
  if (!role) throw notFound("ROLE_NOT_FOUND", "Role not found.");
  return role;
};

export const assignRole = async (p: { userId: string; roleId: string; actorUserId: string }) => {
  const role = await getRole(p.roleId);
  const user = await prisma.user.findUnique({ where: { id: p.userId } });
  if (!user) throw notFound("USER_NOT_FOUND", "User not found.");

  return prisma.$transaction(async (tx) => {
    const assignment = await tx.userRole.upsert({
      where: { userId_roleId: { userId: p.userId, roleId: p.roleId } },
      update: { isActive: true, revokedAt: null, assignedAt: new Date(), assignedByUserId: p.actorUserId },
      create: { userId: p.userId, roleId: p.roleId, assignedByUserId: p.actorUserId, isActive: true },
      include: { role: true },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: p.actorUserId,
        action: "USER_ROLE_ASSIGNED",
        entityType: "UserRole",
        entityId: assignment.id,
        after: { userId: p.userId, roleId: p.roleId, roleCode: role.code },
      },
    });
    return assignment;
  });
};

export const revokeRole = async (p: { userId: string; roleId: string; actorUserId: string }) => {
  const assignment = await repo.findUserRole(p.userId, p.roleId);
  if (!assignment?.isActive) throw notFound("ROLE_ASSIGNMENT_NOT_FOUND", "Active role assignment not found.");

  if (assignment.role.code === "SUPER_ADMIN") {
    const count = await prisma.userRole.count({
      where: { isActive: true, revokedAt: null, role: { code: "SUPER_ADMIN" } },
    });
    if (count <= 1) throw badRequest("LAST_SUPER_ADMIN", "The last active SUPER_ADMIN cannot be revoked.");
  }

  return prisma.$transaction(async (tx) => {
    const revoked = await tx.userRole.update({
      where: { userId_roleId: { userId: p.userId, roleId: p.roleId } },
      data: { isActive: false, revokedAt: new Date() },
      include: { role: true },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: p.actorUserId,
        action: "USER_ROLE_REVOKED",
        entityType: "UserRole",
        entityId: revoked.id,
        before: { userId: p.userId, roleId: p.roleId, roleCode: revoked.role.code, isActive: true },
        after: { isActive: false },
      },
    });
    return revoked;
  });
};
