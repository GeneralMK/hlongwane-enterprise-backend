import crypto from 'node:crypto'
import type { Context } from 'koa'
import { PaymentProvider } from '@prisma/client'
import { processProviderEvent } from './service.js'

export async function paystackWebhookController(ctx: Context) {
  const signature = ctx.get('x-paystack-signature')
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) ctx.throw(500, 'PAYSTACK_SECRET_KEY is not configured')

  const raw = JSON.stringify(ctx.request.body ?? {})
  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex')
  const signatureValid = Boolean(signature) && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))

  const payload = ctx.request.body as any
  const reference = payload?.data?.reference as string | undefined
  const eventType = String(payload?.event ?? 'unknown')
  if (!reference) ctx.throw(400, 'Payment reference missing from webhook payload')

  const providerEventId = payload?.data?.id ? String(payload.data.id) : undefined
  const idempotencyKey = `PAYSTACK:${providerEventId ?? eventType}:${reference}`
  const succeeded = eventType === 'charge.success' || eventType === 'transaction.success'

  await processProviderEvent({
    provider: PaymentProvider.PAYSTACK,
    reference,
    providerEventId,
    eventType,
    idempotencyKey,
    signatureValid,
    payload,
    succeeded
  })

  ctx.status = 200
  ctx.body = { received: true }
}

export const paymentWebhookRouter = (() => {
  const Router = require('@koa/router') as typeof import('@koa/router')
  const router = new Router.default({ prefix: '/webhooks' })
  router.post('/paystack', paystackWebhookController)
  return router
})()
