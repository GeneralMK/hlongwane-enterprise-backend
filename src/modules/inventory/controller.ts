import type { Context } from 'koa'
import { requireRestPermission } from '../../auth/rest.js'
import * as service from './service.js'

export async function listInventoryController(ctx: Context) {
  requireRestPermission(ctx, 'inventory.view')
  const inventory = await service.listInventory()
  ctx.body = { success: true, inventory }
}

export async function adjustInventoryController(ctx: Context) {
  const user = requireRestPermission(ctx, 'inventory.adjust')
  const inventory = await service.adjustInventory((ctx.request as any).body, user.id)
  ctx.body = { success: true, inventory }
}
