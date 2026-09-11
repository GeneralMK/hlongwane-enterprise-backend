import { GraphQLError } from 'graphql'

export type AuthUser = {
  id: string
  permissions: string[]
  isAdmin: boolean
  isSuperAdmin: boolean
}

export function requireUser(user: AuthUser | null | undefined): AuthUser {
  if (!user) {
    throw new GraphQLError('Authentication required.', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } }
    })
  }
  return user
}

export function requirePermission(user: AuthUser | null | undefined, permission: string) {
  const authenticated = requireUser(user)
  if (authenticated.isSuperAdmin) return authenticated
  if (!authenticated.permissions.includes(permission)) {
    throw new GraphQLError('You do not have permission to perform this action.', {
      extensions: { code: 'FORBIDDEN', http: { status: 403 } }
    })
  }
  return authenticated
}

export function requireAdmin(user: AuthUser | null | undefined) {
  const authenticated = requireUser(user)
  if (!authenticated.isAdmin && !authenticated.isSuperAdmin) {
    throw new GraphQLError('Administrator access required.', {
      extensions: { code: 'FORBIDDEN', http: { status: 403 } }
    })
  }
  return authenticated
}
