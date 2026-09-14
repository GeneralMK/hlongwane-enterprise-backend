import prisma from "prisma";
import { StockMovementType } from "@prisma/client";
import { z } from "zod";

import * as repo from "../repositories/index.js";
import { notFound, badRequest } from "src/types/app-errors.js";
const schema = z.object({
  quantityDelta: z.number().int(),
  notes: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
});
export const listInventory = async () => {
  const xs = await repo.list();
  return xs.map((x) => ({
    ...x,
    availableQuantity: x.physicalQuantity - x.reservedQuantity,
  }));
};
export const getInventory = async (variantId: string) => {
  const x = await repo.byVariant(variantId);
  if (!x) throw notFound("INVENTORY_NOT_FOUND", "Inventory not found.");
  return { ...x, availableQuantity: x.physicalQuantity - x.reservedQuantity };
};
export const adjustInventory = async (p: {
  variantId: string;
  raw: unknown;
  actorUserId: string;
}) => {
  const i = schema.parse(p.raw);
  return prisma.$transaction(async (tx) => {
    const x = await tx.inventory.findUnique({
      where: { variantId: p.variantId },
    });
    if (!x) throw notFound("INVENTORY_NOT_FOUND", "Inventory not found.");
    const result = x.physicalQuantity + i.quantityDelta;
    if (result < 0 || result < x.reservedQuantity)
      throw badRequest(
        "INVALID_STOCK_ADJUSTMENT",
        "Physical quantity cannot be negative or lower than reserved quantity.",
      );
    const u = await tx.inventory.update({
      where: { variantId: p.variantId },
      data: { physicalQuantity: result },
    });
    await tx.stockMovement.create({
      data: {
        variantId: p.variantId,
        type: StockMovementType.MANUAL_ADJUSTMENT,
        quantity: i.quantityDelta,
        previousPhysicalQuantity: x.physicalQuantity,
        resultingPhysicalQuantity: result,
        previousReservedQuantity: x.reservedQuantity,
        resultingReservedQuantity: x.reservedQuantity,
        referenceType: i.referenceType,
        referenceId: i.referenceId,
        notes: i.notes,
        createdByUserId: p.actorUserId,
      },
    });
    return { ...u, availableQuantity: u.physicalQuantity - u.reservedQuantity };
  });
};
