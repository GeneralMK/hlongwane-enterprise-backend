import crypto from 'node:crypto'
import { PaymentProvider, PaymentStatus, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import * as repo from './repository.js'

export const listPayments = repo.listPayments
export const getPayment = repo.findPayment

export async function initializePayment(orderId: string, provider: PaymentProvider, actorUserId: string, isAdmin = false) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw new Error('Order not found')
  if (!isAdmin && order.userId !== actorUserId) throw new Error('Order not found')
  if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PAYMENT_FAILED') throw new Error('Order is not payable')

  const reference = `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
  return prisma.payment.create({
    data: {
      orderId,
      provider,
      reference,
      amount: order.total,
      currency: order.currency,
      status: PaymentStatus.INITIALIZED
    }
  })
}

export async function processProviderEvent(params: {
  provider: PaymentProvider
  reference: string
  providerEventId?: string
  eventType: string
  idempotencyKey: string
  signatureValid: boolean
  payload: unknown
  succeeded: boolean
}) {
  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.paymentEvent.findUnique({ where: { idempotencyKey: params.idempotencyKey } })
    if (duplicate) return duplicate

    const payment = await tx.payment.findUnique({ where: { reference: params.reference }, include: { order: true } })
    if (!payment) throw new Error('Payment not found')
    if (payment.provider !== params.provider) throw new Error('Payment provider mismatch')

    const event = await tx.paymentEvent.create({
      data: {
        paymentId: payment.id,
        providerEventId: params.providerEventId,
        idempotencyKey: params.idempotencyKey,
        eventType: params.eventType,
        signatureValid: params.signatureValid,
        payload: params.payload as Prisma.InputJsonValue,
        processedAt: new Date()
      }
    })

    if (!params.signatureValid) return event

    if (params.succeeded && payment.status !== PaymentStatus.SUCCEEDED) {
      await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.SUCCEEDED, paidAt: new Date(), verifiedAt: new Date() } })
      if (payment.order.status === 'PENDING_PAYMENT' || payment.order.status === 'PAYMENT_FAILED') {
        await tx.order.update({ where: { id: payment.orderId }, data: { status: 'PAID', paidAt: new Date() } })
        await tx.orderStatusHistory.create({ data: { orderId: payment.orderId, status: 'PAID', note: `Payment verified via ${params.provider}` } })
      }
    }

    return event
  })
}
