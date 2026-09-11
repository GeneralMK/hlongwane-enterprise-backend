import { OrderStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import * as repo from './repository.js'

const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_FAILED: ['PENDING_PAYMENT', 'CANCELLED'],
  PAID: ['PROCESSING', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  CANCELLED: [],
  RETURN_REQUESTED: ['RETURNED'],
  RETURNED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  REFUNDED: [],
  PARTIALLY_REFUNDED: []
}

export const listOrders = repo.listOrders
export const getOrder = repo.findOrder

export async function transitionOrder(orderId: string, nextStatus: OrderStatus, actorUserId: string, note?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } })
    if (!order) throw new Error('Order not found')
    if (!allowedTransitions[order.status].includes(nextStatus)) {
      throw new Error(`Invalid order transition: ${order.status} -> ${nextStatus}`)
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        ...(nextStatus === OrderStatus.PAID ? { paidAt: new Date() } : {}),
        ...(nextStatus === OrderStatus.CANCELLED ? { cancelledAt: new Date() } : {})
      }
    })

    await tx.orderStatusHistory.create({
      data: { orderId, status: nextStatus, note, changedByUserId: actorUserId }
    })

    return updated
  })
}
