import type { Context } from 'koa'
import { requireRestUser } from './rest.js'
import { loginUser, registerCustomer } from './service.js'

export async function registerController(ctx: Context) {
  const result = await registerCustomer((ctx.request as any).body)
  ctx.status = 201
  ctx.body = { success: true, ...result }
}

export async function loginController(ctx: Context) {
  const result = await loginUser((ctx.request as any).body)
  ctx.status = 200
  ctx.body = { success: true, ...result }
}

export async function meController(ctx: Context) {
  const user = requireRestUser(ctx)
  ctx.body = { success: true, user }
}

export async function logoutController(ctx: Context) {
  requireRestUser(ctx)
  ctx.status = 200
  ctx.body = {
    success: true,
    message: 'Local session should be cleared by the client. Supabase access tokens expire or can be revoked through Supabase Auth.'
  }
}
