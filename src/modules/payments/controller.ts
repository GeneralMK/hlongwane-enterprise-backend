import type { Context } from 'koa'
import { PaymentProvider } from '@prisma/client'
import { initializePayment } from './service.js'

export async function initializePaymentController(ctx: Context) {
  const body = ctx.request.body as { orderId?: string; provider?: PaymentProvider }
  if (!body.orderId || !body.provider) ctx.throw(400, 'orderId and provider are required')
  const payment = await initializePayment(body.orderId, body.provider)
  ctx.status = 201
  ctx.body = { success: true, payment }
}
