import { requirePermission } from '../../auth/guard.js'
import type { AppContext } from '../../types/context.js'
import * as service from './service.js'

export const inventoryResolvers = {
  Query: {
    inventory: (_: unknown, __: unknown, ctx: AppContext) => {
      requirePermission(ctx.user, 'inventory.view')
      return service.listInventory()
    },
    inventoryByVariant: (_: unknown, args: { variantId: string }, ctx: AppContext) => {
      requirePermission(ctx.user, 'inventory.view')
      return service.getInventoryByVariant(args.variantId)
    }
  },
  Mutation: {
    adjustInventory: (_: unknown, args: { input: unknown }, ctx: AppContext) => {
      const user = requirePermission(ctx.user, 'inventory.adjust')
      return service.adjustInventory(args.input, user.id)
    }
  },
  InventoryRecord: {
    availableQuantity: (inventory: { physicalQuantity: number; reservedQuantity: number }) => inventory.physicalQuantity - inventory.reservedQuantity
  }
}
