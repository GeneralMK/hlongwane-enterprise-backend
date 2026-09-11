import type { UserRole } from '@prisma/client'
import * as repo from './repository.js'

export const listUsers = repo.listUsers
export const getUser = repo.findUser

export async function assignRole(userId: string, role: UserRole, assignedByUserId: string) {
  const user = await repo.findUser(userId)
  if (!user) throw new Error('User not found')
  return repo.assignRole(userId, role, assignedByUserId)
}

export async function revokeRole(userId: string, role: UserRole) {
  const user = await repo.findUser(userId)
  if (!user) throw new Error('User not found')
  return repo.revokeRole(userId, role)
}
