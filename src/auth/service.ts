import { findUserByAuthUserId, findUserWithAccess } from './repository.js'
import { supabaseAdmin } from '../lib/supabase.js'

export async function authenticateAccessToken(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return null

  const localUser = await findUserByAuthUserId(data.user.id)
  if (!localUser || !localUser.isActive) return null

  return buildAccessContext(localUser.id)
}

export async function buildAccessContext(userId: string) {
  const user = await findUserWithAccess(userId)
  if (!user || !user.isActive) return null

  const activeRoles = user.userRoles
    .map((assignment) => assignment.role)
    .filter((role) => role.isActive)

  const roles = activeRoles.map(({ id, code, name }) => ({ id, code, name }))
  const permissions = Array.from(
    new Set(
      activeRoles.flatMap((role) =>
        role.permissions
          .filter((rp) => rp.permission.isActive)
          .map((rp) => rp.permission.code)
      )
    )
  )

  const roleCodes = new Set(roles.map((role) => role.code))

  return {
    id: user.id,
    authUserId: user.authUserId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles,
    permissions,
    isAdmin: Boolean(user.adminProfile) || roleCodes.has('ADMIN') || roleCodes.has('SUPER_ADMIN'),
    isSuperAdmin: roleCodes.has('SUPER_ADMIN')
  }
}
