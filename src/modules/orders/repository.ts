import type { OrderStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

const include = {
  items: true,
  payments: true,
  shipments: { include: { events: true } },
  statusHistory: { orderBy: { createdAt: 'asc' as const } }
}

export function listOrders(args: { userId?: string; status?: OrderStatus; take?: number; skip?: number }) {
  return prisma.order.findMany({
    where: { userId: args.userId, status: args.status },
    include,
    orderBy: { createdAt: 'desc' },
    take: args.take ?? 50,
    skip: args.skip ?? 0
  })
}

export function findOrder(id: string) {
  return prisma.order.findUnique({ where: { id }, include })
}
