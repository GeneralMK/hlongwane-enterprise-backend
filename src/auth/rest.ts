import type { Context } from 'koa'
import type { ContextUser } from '../types/context.js'

export function requireRestUser(ctx: Context): ContextUser {
  const user = ctx.state.user as ContextUser | null | undefined
  if (!user) ctx.throw(401, 'Authentication required')
  return user
}

export function requireRestPermission(ctx: Context, permission: string): ContextUser {
  const user = requireRestUser(ctx)
  if (!user.isSuperAdmin && !user.permissions.includes(permission)) {
    ctx.throw(403, 'You do not have permission to perform this action')
  }
  return user
}
