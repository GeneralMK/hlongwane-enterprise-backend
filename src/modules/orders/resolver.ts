import type { OrderStatus } from '@prisma/client'
import { requirePermission, requireUser } from '../../auth/guard.js'
import type { AppContext } from '../../types/context.js'
import * as service from './service.js'

export const orderResolvers = {
  Query: {
    orders: (_: unknown, args: { filter?: { userId?: string; status?: OrderStatus; take?: number; skip?: number } }, ctx: AppContext) => {
      const user = requireUser(ctx.user)
      if (!user.isAdmin && !user.isSuperAdmin) {
        return service.listOrders({ ...(args.filter ?? {}), userId: user.id })
      }
      requirePermission(ctx.user, 'orders.view')
      return service.listOrders(args.filter ?? {})
    },
    order: async (_: unknown, args: { id: string }, ctx: AppContext) => {
      const user = requireUser(ctx.user)
      const order = await service.getOrder(args.id)
      if (!order) return null
      if (user.isAdmin || user.isSuperAdmin) {
        requirePermission(ctx.user, 'orders.view')
        return order
      }
      if (order.userId !== user.id) return null
      return order
    }
  },
  Mutation: {
    transitionOrder: (_: unknown, args: { id: string; status: OrderStatus; note?: string }, ctx: AppContext) => {
      const user = requirePermission(ctx.user, 'orders.update')
      return service.transitionOrder(args.id, args.status, user.id, args.note)
    }
  },
  Order: {
    subtotal: (o: any) => o.subtotal.toString(), discountTotal: (o: any) => o.discountTotal.toString(), deliveryFee: (o: any) => o.deliveryFee.toString(), taxTotal: (o: any) => o.taxTotal.toString(), total: (o: any) => o.total.toString(),
    placedAt: (o: any) => o.placedAt.toISOString(), paidAt: (o: any) => o.paidAt?.toISOString() ?? null, cancelledAt: (o: any) => o.cancelledAt?.toISOString() ?? null
  }
}
