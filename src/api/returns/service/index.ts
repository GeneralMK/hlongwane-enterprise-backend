import prisma from "prisma";
import { ReturnStatus } from "@prisma/client";
import { z } from "zod";

import * as repo from "../repositories/index.js";
import { badRequest, notFound } from "src/types/app-errors.js";
const schema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(1),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});
export const getReturn = async (id: string) => {
  const x = await repo.byId(id);
  if (!x) throw notFound("RETURN_NOT_FOUND", "Return request not found.");
  return x;
};
export const createReturn = async (p: { userId: string; raw: unknown }) => {
  const i = schema.parse(p.raw);
  const o = await prisma.order.findUnique({
    where: { id: i.orderId },
    include: { items: true },
  });
  if (!o || o.userId !== p.userId)
    throw notFound("ORDER_NOT_FOUND", "Order not found.");
  if (o.status !== "DELIVERED")
    throw badRequest(
      "ORDER_NOT_RETURNABLE",
      "Only delivered orders can be returned.",
    );
  const map = new Map(o.items.map((x) => [x.id, x]));
  for (const item of i.items) {
    const oi = map.get(item.orderItemId);
    if (!oi || item.quantity > oi.quantity)
      throw badRequest(
        "INVALID_RETURN_ITEM",
        "One or more return items are invalid.",
      );
  }
  return prisma.returnRequest.create({
    data: {
      orderId: o.id,
      requestedByUserId: p.userId,
      status: ReturnStatus.REQUESTED,
      reason: i.reason,
      notes: i.notes,
      items: { create: i.items },
    },
    include: { items: true },
  });
};
export const approveReturn = async (id: string) => {
  await getReturn(id);
  return repo.updateStatus(id, ReturnStatus.APPROVED);
};
export const rejectReturn = async (id: string) => {
  await getReturn(id);
  return repo.updateStatus(id, ReturnStatus.REJECTED);
};
