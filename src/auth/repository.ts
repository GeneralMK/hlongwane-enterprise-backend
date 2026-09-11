import { prisma } from '../lib/prisma.js'

export async function findUserWithAccess(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      adminProfile: true,
      userRoles: {
        where: { isActive: true, revokedAt: null },
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } }
            }
          }
        }
      }
    }
  })
}

export async function findUserByAuthUserId(authUserId: string) {
  return prisma.user.findUnique({ where: { authUserId } })
}
