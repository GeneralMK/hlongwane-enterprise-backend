import prisma from "prisma";
import { z } from "zod";

import * as repo from "../repositories/index.js";
import { notFound, badRequest } from "src/types/app-errors.js";
const addSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive(),
});
export const getMyCart = async (userId: string) =>
  (await repo.activeForUser(userId)) ??
  (await prisma.cart.create({
    data: { userId, status: "ACTIVE" },
    include: { items: true },
  }));
export const addItem = async (userId: string, raw: unknown) => {
  const i = addSchema.parse(raw);
  const cart = await getMyCart(userId);
  const v = await prisma.productVariant.findUnique({
    where: { id: i.variantId },
    include: { inventory: true },
  });
  if (!v?.isActive)
    throw notFound("VARIANT_NOT_FOUND", "Product variant not found.");
  const available =
    (v.inventory?.physicalQuantity ?? 0) - (v.inventory?.reservedQuantity ?? 0);
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId: v.id } },
  });
  const newQty = (existing?.quantity ?? 0) + i.quantity;
  if (newQty > available)
    throw badRequest(
      "INSUFFICIENT_STOCK",
      "Requested quantity is not available.",
    );
  const price = v.salePrice ?? v.price;
  return prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId: v.id } },
    update: { quantity: newQty, unitPriceSnapshot: price },
    create: {
      cartId: cart.id,
      variantId: v.id,
      quantity: i.quantity,
      unitPriceSnapshot: price,
    },
    include: { variant: { include: { product: true } } },
  });
};
export const updateQuantity = async (
  userId: string,
  itemId: string,
  quantity: number,
) => {
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw badRequest(
      "INVALID_QUANTITY",
      "Quantity must be a positive integer.",
    );
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true, variant: { include: { inventory: true } } },
  });
  if (!item || item.cart.userId !== userId)
    throw notFound("CART_ITEM_NOT_FOUND", "Cart item not found.");
  const available =
    (item.variant.inventory?.physicalQuantity ?? 0) -
    (item.variant.inventory?.reservedQuantity ?? 0);
  if (quantity > available)
    throw badRequest(
      "INSUFFICIENT_STOCK",
      "Requested quantity is not available.",
    );
  return prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
};
export const removeItem = async (userId: string, itemId: string) => {
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true },
  });
  if (!item || item.cart.userId !== userId)
    throw notFound("CART_ITEM_NOT_FOUND", "Cart item not found.");
  await prisma.cartItem.delete({ where: { id: itemId } });
};
