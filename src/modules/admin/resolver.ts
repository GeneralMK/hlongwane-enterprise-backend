import type { UserRole } from '@prisma/client'
import { requirePermission } from '../../auth/guard.js'
import type { AppContext } from '../../types/context.js'
import * as service from './service.js'

export const adminResolvers = {
  Query: {
    users: (_: unknown, __: unknown, ctx: AppContext) => {
      requirePermission(ctx.user, 'users.view')
      return service.listUsers()
    },
    user: (_: unknown, args: { id: string }, ctx: AppContext) => {
      requirePermission(ctx.user, 'users.view')
      return service.getUser(args.id)
    }
  },
  Mutation: {
    assignUserRole: (_: unknown, args: { userId: string; role: UserRole }, ctx: AppContext) => {
      const actor = requirePermission(ctx.user, 'admins.assign_roles')
      return service.assignRole(args.userId, args.role, actor.id)
    },
    revokeUserRole: (_: unknown, args: { userId: string; role: UserRole }, ctx: AppContext) => {
      requirePermission(ctx.user, 'admins.assign_roles')
      return service.revokeRole(args.userId, args.role)
    }
  },
  User: {
    createdAt: (user: any) => user.createdAt.toISOString(),
    updatedAt: (user: any) => user.updatedAt.toISOString()
  },
  UserRoleAssignment: {
    assignedAt: (assignment: any) => assignment.assignedAt.toISOString(),
    revokedAt: (assignment: any) => assignment.revokedAt?.toISOString() ?? null
  }
}
