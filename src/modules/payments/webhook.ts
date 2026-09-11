import crypto from 'node:crypto'
import { PaymentProvider } from '@prisma/client'
import Router from '@koa/router'
import type { Context } from 'koa'
import { processProviderEvent } from './service.js'

function getRawBody(payload: any): Buffer {
  const raw = payload?.[Symbol.for('unparsedBody')]
  if (Buffer.isBuffer(raw)) return raw
  if (typeof raw === 'string') return Buffer.from(raw)
  return Buffer.from(JSON.stringify(payload ?? {}))
}

export async function paystackWebhookController(ctx: Context) {
  const signature = ctx.get('x-paystack-signature')
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) ctx.throw(500, 'PAYSTACK_SECRET_KEY is not configured')

  const payload = (ctx.request as any).body as any
  const raw = getRawBody(payload)
  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex')
  const signatureValid = Boolean(signature) && signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))

  const reference = payload?.data?.reference as string | undefined
  const eventType = String(payload?.event ?? 'unknown')
  if (!reference) ctx.throw(400, 'Payment reference missing from webhook payload')

  const providerEventId = payload?.data?.id ? String(payload.data.id) : undefined
  const idempotencyKey = `PAYSTACK:${providerEventId ?? eventType}:${reference}`
  const succeeded = eventType === 'charge.success' || eventType === 'transaction.success'
  const amountMinor = typeof payload?.data?.amount === 'number' ? payload.data.amount : undefined

  await processProviderEvent({
    provider: PaymentProvider.PAYSTACK,
    reference,
    providerEventId,
    eventType,
    idempotencyKey,
    signatureValid,
    amountMinor,
    payload,
    succeeded
  })

  ctx.status = 200
  ctx.body = { received: true }
}

export const paymentWebhookRouter = new Router({ prefix: '/webhooks' })
paymentWebhookRouter.post('/paystack', paystackWebhookController)
