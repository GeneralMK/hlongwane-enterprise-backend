import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { supabaseAdmin, supabasePublic } from '../lib/supabase.js'
import { findUserByAuthUserId, findUserWithAccess } from './repository.js'

const registerInput = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional()
})

const loginInput = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1)
})

export async function registerCustomer(input: unknown) {
  const data = registerInput.parse(input)
  const { data: auth, error } = await supabasePublic.auth.signUp({
    email: data.email,
    password: data.password,
    options: { data: { firstName: data.firstName, lastName: data.lastName } }
  })

  if (error || !auth.user) throw new Error(error?.message ?? 'Unable to register user')

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          authUserId: auth.user!.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: UserRole.CUSTOMER
        }
      })

      await tx.userRoleAssignment.create({
        data: { userId: created.id, role: UserRole.CUSTOMER }
      })

      return created
    })

    return { user: await buildAccessContext(user.id), session: auth.session }
  } catch (databaseError) {
    await supabaseAdmin.auth.admin.deleteUser(auth.user.id).catch(() => undefined)
    throw databaseError
  }
}

export async function loginUser(input: unknown) {
  const data = loginInput.parse(input)
  const { data: auth, error } = await supabasePublic.auth.signInWithPassword({
    email: data.email,
    password: data.password
  })

  if (error || !auth.user || !auth.session) throw new Error('Invalid email or password')

  const user = await findUserByAuthUserId(auth.user.id)
  if (!user || !user.isActive) throw new Error('User account is unavailable')

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  const access = await buildAccessContext(user.id)

  return { user: access, session: auth.session }
}

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

  const roleCodes = new Set<string>([
    user.role,
    ...user.userRoles.map((assignment) => assignment.role)
  ])

  const roles = Array.from(roleCodes).map((code) => ({
    id: code,
    code,
    name: code.replaceAll('_', ' ')
  }))

  const permissions = Array.from(
    new Set(
      user.adminProfile?.permissions.map((assignment) => assignment.permission.code) ?? []
    )
  )

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
