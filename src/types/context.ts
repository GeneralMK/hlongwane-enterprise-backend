import type { PrismaClient } from '@prisma/client'

export type ContextRole = { id: string; code: string; name: string }

export type ContextUser = {
  id: string
  authUserId: string
  email: string
  firstName: string
  lastName: string
  roles: ContextRole[]
  permissions: string[]
  isAdmin: boolean
  isSuperAdmin: boolean
}

export type AppContext = {
  prisma: PrismaClient
  user: ContextUser | null
  isSystem?: boolean
}
