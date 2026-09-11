import { StockMovementType } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import * as repo from './repository.js'

const adjustInput = z.object({
  variantId: z.string().uuid(),
  quantityDelta: z.number().int(),
  notes: z.string().optional()
})

export const listInventory = repo.listInventory
export const getInventoryByVariant = repo.getInventoryByVariant

export async function adjustInventory(input: unknown, actorUserId: string) {
  const data = adjustInput.parse(input)

  return prisma.$transaction(async (tx) => {
    const current = await tx.inventory.findUnique({ where: { variantId: data.variantId } })
    if (!current) throw new Error('Inventory record not found')

    const resultingPhysicalQuantity = current.physicalQuantity + data.quantityDelta
    if (resultingPhysicalQuantity < current.reservedQuantity || resultingPhysicalQuantity < 0) {
      throw new Error('Inventory adjustment would make available stock negative')
    }

    const inventory = await tx.inventory.update({
      where: { variantId: data.variantId },
      data: { physicalQuantity: resultingPhysicalQuantity }
    })

    await tx.stockMovement.create({
      data: {
        variantId: data.variantId,
        type: StockMovementType.MANUAL_ADJUSTMENT,
        quantity: data.quantityDelta,
        previousPhysicalQuantity: current.physicalQuantity,
        resultingPhysicalQuantity,
        previousReservedQuantity: current.reservedQuantity,
        resultingReservedQuantity: current.reservedQuantity,
        notes: data.notes,
        createdByUserId: actorUserId
      }
    })

    return inventory
  })
}
