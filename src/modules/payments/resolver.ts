import type { PaymentProvider } from '@prisma/client'
import { requirePermission, requireUser } from '../../auth/guard.js'
import type { AppContext } from '../../types/context.js'
import * as service from './service.js'

export const paymentResolvers = {
  Query: {
    payments: (_: unknown, __: unknown, ctx: AppContext) => {
      requirePermission(ctx.user, 'payments.view')
      return service.listPayments()
    },
    payment: async (_: unknown, args: { id: string }, ctx: AppContext) => {
      const user = requireUser(ctx.user)
      const payment = await service.getPayment(args.id)
      if (!payment) return null
      if (user.isAdmin || user.isSuperAdmin) {
        requirePermission(ctx.user, 'payments.view')
        return payment
      }
      if (payment.order.userId !== user.id) return null
      return payment
    }
  },
  Mutation: {
    initializePayment: (_: unknown, args: { orderId: string; provider: PaymentProvider }, ctx: AppContext) => {
      requireUser(ctx.user)
      return service.initializePayment(args.orderId, args.provider)
    }
  },
  Payment: {
    amount: (p: any) => p.amount.toString(),
    paidAt: (p: any) => p.paidAt?.toISOString() ?? null,
    verifiedAt: (p: any) => p.verifiedAt?.toISOString() ?? null,
    createdAt: (p: any) => p.createdAt.toISOString()
  }
}
