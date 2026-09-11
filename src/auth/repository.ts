import { prisma } from '../lib/prisma.js'

export async function findUserWithAccess(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      adminProfile: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      },
      userRoles: {
        where: { isActive: true, revokedAt: null }
      }
    }
  })
}

export async function findUserByAuthUserId(authUserId: string) {
  return prisma.user.findUnique({ where: { authUserId } })
}
