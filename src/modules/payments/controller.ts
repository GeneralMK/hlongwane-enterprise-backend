import { PaymentProvider } from '@prisma/client'
import type { Context } from 'koa'
import { requireRestUser } from '../../auth/rest.js'
import { initializePayment } from './service.js'

export async function initializePaymentController(ctx: Context) {
  const user = requireRestUser(ctx)
  const body = (ctx.request as any).body as { orderId?: string; provider?: PaymentProvider }
  if (!body.orderId || !body.provider) ctx.throw(400, 'orderId and provider are required')
  const payment = await initializePayment(body.orderId, body.provider, user.id, user.isAdmin || user.isSuperAdmin)
  ctx.status = 201
  ctx.body = { success: true, payment }
}
