import type { UserRole } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

export function listUsers() {
  return prisma.user.findMany({
    include: { adminProfile: true, userRoles: true },
    orderBy: { createdAt: 'desc' }
  })
}

export function findUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { adminProfile: true, userRoles: true }
  })
}

export function assignRole(userId: string, role: UserRole, assignedByUserId: string) {
  return prisma.userRoleAssignment.upsert({
    where: { userId_role: { userId, role } },
    update: { isActive: true, revokedAt: null, assignedByUserId, assignedAt: new Date() },
    create: { userId, role, assignedByUserId }
  })
}

export function revokeRole(userId: string, role: UserRole) {
  return prisma.userRoleAssignment.update({
    where: { userId_role: { userId, role } },
    data: { isActive: false, revokedAt: new Date() }
  })
}
