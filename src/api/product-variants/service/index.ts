import { Prisma } from "@prisma/client";
import { z } from "zod";

import * as repo from "../repositories/index.js";
import { notFound } from "src/types/app-errors.js";
const createSchema = z.object({
  productId: z.string().uuid(),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  salePrice: z.coerce.number().nonnegative().optional(),
  costPrice: z.coerce.number().nonnegative().optional(),
  attributes: z.record(z.string(), z.unknown()),
  weightGrams: z.number().int().nonnegative().optional(),
});
const updateSchema = createSchema
  .omit({ productId: true })
  .partial()
  .extend({
    barcode: z.string().nullable().optional(),
    salePrice: z.coerce.number().nonnegative().nullable().optional(),
    costPrice: z.coerce.number().nonnegative().nullable().optional(),
    weightGrams: z.number().int().nonnegative().nullable().optional(),
    isActive: z.boolean().optional(),
  });
export const getVariant = async (id: string) => {
  const x = await repo.byId(id);
  if (!x) throw notFound("VARIANT_NOT_FOUND", "Product variant not found.");
  return x;
};
export const listProductVariants = repo.byProduct;
export const createVariant = (raw: unknown) => {
  const i = createSchema.parse(raw);
  return repo.create({
    product: { connect: { id: i.productId } },
    sku: i.sku.trim(),
    barcode: i.barcode,
    price: new Prisma.Decimal(i.price),
    salePrice:
      i.salePrice !== undefined ? new Prisma.Decimal(i.salePrice) : undefined,
    costPrice:
      i.costPrice !== undefined ? new Prisma.Decimal(i.costPrice) : undefined,
    attributes: i.attributes as Prisma.InputJsonValue,
    weightGrams: i.weightGrams,
    inventory: {
      create: {
        physicalQuantity: 0,
        reservedQuantity: 0,
        soldQuantity: 0,
        reorderLevel: 0,
      },
    },
  });
};
export const updateVariant = async (id: string, raw: unknown) => {
  await getVariant(id);
  const i = updateSchema.parse(raw);
  return repo.update(id, {
    ...(i.sku && { sku: i.sku.trim() }),
    ...(i.barcode !== undefined && { barcode: i.barcode }),
    ...(i.price !== undefined && { price: new Prisma.Decimal(i.price) }),
    ...(i.salePrice !== undefined && {
      salePrice: i.salePrice === null ? null : new Prisma.Decimal(i.salePrice),
    }),
    ...(i.costPrice !== undefined && {
      costPrice: i.costPrice === null ? null : new Prisma.Decimal(i.costPrice),
    }),
    ...(i.attributes !== undefined && {
      attributes: i.attributes as Prisma.InputJsonValue,
    }),
    ...(i.weightGrams !== undefined && { weightGrams: i.weightGrams }),
    ...(i.isActive !== undefined && { isActive: i.isActive }),
  });
};
