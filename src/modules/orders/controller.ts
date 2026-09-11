import type { Context } from 'koa'
import type { OrderStatus } from '@prisma/client'
import { requireRestPermission, requireRestUser } from '../../auth/rest.js'
import * as service from './service.js'

export async function getOrderController(ctx: Context) {
  const user = requireRestUser(ctx)
  const id = String((ctx as Context & { params: { id: string } }).params.id)
  const order = await service.getOrder(id)
  if (!order) ctx.throw(404, 'Order not found')

  if (user.isAdmin || user.isSuperAdmin) {
    requireRestPermission(ctx, 'orders.view')
  } else if (order.userId !== user.id) {
    ctx.throw(404, 'Order not found')
  }

  ctx.body = { success: true, order }
}

export async function transitionOrderController(ctx: Context) {
  const user = requireRestPermission(ctx, 'orders.update')
  const id = String((ctx as Context & { params: { id: string } }).params.id)
  const body = (ctx.request as any).body as { status?: OrderStatus; note?: string }
  if (!body.status) ctx.throw(400, 'status is required')

  const order = await service.transitionOrder(id, body.status, user.id, body.note)
  ctx.body = { success: true, order }
}
