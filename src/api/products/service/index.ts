import { ProductStatus, type Prisma } from "@prisma/client";
import { z } from "zod";

import { slugify } from "../../../utilities/index.js";
import * as repo from "../repositories/index.js";
import { notFound } from "src/types/app-errors.js";
const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  brandId: z.string().uuid(),
  categoryId: z.string().uuid(),
  specifications: z.record(z.string(), z.unknown()).optional(),
  warrantyMonths: z.number().int().nonnegative().optional(),
  isFeatured: z.boolean().optional(),
});
const updateSchema = createSchema
  .partial()
  .extend({
    status: z.nativeEnum(ProductStatus).optional(),
    shortDescription: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    warrantyMonths: z.number().int().nonnegative().nullable().optional(),
  });
export const listProducts = async (p: repo.FindProductsParams) => {
  const [items, total] = await repo.list(p);
  return {
    total,
    items: items.map((product) => ({
      ...product,
      variants: product.variants.map((v) => ({
        ...v,
        availableQuantity: v.inventory
          ? v.inventory.physicalQuantity - v.inventory.reservedQuantity
          : 0,
      })),
    })),
  };
};
export const getProduct = async (id: string) => {
  const x = await repo.byId(id);
  if (!x) throw notFound("PRODUCT_NOT_FOUND", "Product not found.");
  return x;
};
export const createProduct = (raw: unknown) => {
  const i = createSchema.parse(raw);
  return repo.create({
    name: i.name.trim(),
    slug: i.slug ? slugify(i.slug) : slugify(i.name),
    shortDescription: i.shortDescription,
    description: i.description,
    status: ProductStatus.DRAFT,
    specifications: (i.specifications ?? {}) as Prisma.InputJsonValue,
    warrantyMonths: i.warrantyMonths,
    isFeatured: i.isFeatured ?? false,
    brand: { connect: { id: i.brandId } },
    category: { connect: { id: i.categoryId } },
  });
};
export const updateProduct = async (id: string, raw: unknown) => {
  await getProduct(id);
  const i = updateSchema.parse(raw);
  const data: Prisma.ProductUpdateInput = {
    ...(i.name && { name: i.name.trim() }),
    ...(i.slug && { slug: slugify(i.slug) }),
    ...(i.shortDescription !== undefined && {
      shortDescription: i.shortDescription,
    }),
    ...(i.description !== undefined && { description: i.description }),
    ...(i.status && {
      status: i.status,
      ...(i.status === ProductStatus.ACTIVE && { publishedAt: new Date() }),
    }),
    ...(i.specifications !== undefined && {
      specifications: i.specifications as Prisma.InputJsonValue,
    }),
    ...(i.warrantyMonths !== undefined && { warrantyMonths: i.warrantyMonths }),
    ...(i.isFeatured !== undefined && { isFeatured: i.isFeatured }),
    ...(i.brandId && { brand: { connect: { id: i.brandId } } }),
    ...(i.categoryId && { category: { connect: { id: i.categoryId } } }),
  };
  return repo.update(id, data);
};
export const archiveProduct = async (id: string) => {
  await getProduct(id);
  return repo.archive(id);
};
