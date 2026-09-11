import { prisma } from '../../lib/prisma.js'

export function getInventoryByVariant(variantId: string) {
  return prisma.inventory.findUnique({ where: { variantId }, include: { variant: { include: { product: true } } } })
}

export function listInventory() {
  return prisma.inventory.findMany({ include: { variant: { include: { product: true } } }, orderBy: { updatedAt: 'desc' } })
}
