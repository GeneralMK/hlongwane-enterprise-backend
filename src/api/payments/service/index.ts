import prisma from "prisma";
import {
  PaymentProvider,
  PaymentStatus,
  OrderStatus,
  RefundStatus,
} from "@prisma/client";
import { z } from "zod";

import { generateUUID } from "../../../utilities/index.js";

import * as repo from "../repositories/index.js";
import { getPaymentProviderAdapter } from "src/utilities/payments/index.js";
import { notFound, badRequest } from "src/types/app-errors.js";
const checkoutSchema = z.object({
  orderId: z.string().uuid(),
  provider: z.nativeEnum(PaymentProvider),
  callbackUrl: z.string().url().optional(),
});
const refundSchema = z.object({
  amount: z.coerce.number().positive(),
  reason: z.string().optional(),
});
export const getPayment = async (id: string) => {
  const x = await repo.byId(id);
  if (!x) throw notFound("PAYMENT_NOT_FOUND", "Payment not found.");
  return x;
};
export const getPaymentByReference = async (ref: string) => {
  const x = await repo.byReference(ref);
  if (!x) throw notFound("PAYMENT_NOT_FOUND", "Payment not found.");
  return x;
};
export const initializeCheckout = async (p: {
  userId: string;
  email: string;
  raw: unknown;
}) => {
  const i = checkoutSchema.parse(p.raw);
  const o = await prisma.order.findUnique({ where: { id: i.orderId } });
  if (!o || o.userId !== p.userId)
    throw notFound("ORDER_NOT_FOUND", "Order not found.");
  if (o.status !== OrderStatus.PENDING_PAYMENT)
    throw badRequest("ORDER_NOT_PAYABLE", "Order is not awaiting payment.");
  const reference = `PAY-${Date.now()}-${generateUUID().slice(0, 8).toUpperCase()}`;
  const payment = await repo.create({
    orderId: o.id,
    provider: i.provider,
    reference,
    amount: Number(o.total),
    currency: o.currency,
  });
  const adapter = getPaymentProviderAdapter(i.provider);
  try {
    const c = await adapter.initializeCheckout({
      paymentId: payment.id,
      reference,
      amount: Number(o.total),
      currency: o.currency,
      email: p.email,
      callbackUrl: i.callbackUrl,
    });
    return repo.update(payment.id, {
      status: PaymentStatus.PENDING,
      providerReference: c.providerReference,
      checkoutUrl: c.checkoutUrl,
    });
  } catch (e) {
    await repo.update(payment.id, {
      status: PaymentStatus.FAILED,
      failureMessage:
        e instanceof Error
          ? e.message
          : "Provider checkout initialization failed.",
    });
    throw e;
  }
};
export const requestRefund = async (p: {
  paymentId: string;
  actorUserId: string;
  raw: unknown;
}) => {
  const i = refundSchema.parse(p.raw);
  const payment = await getPayment(p.paymentId);
  if (payment.status !== PaymentStatus.SUCCEEDED)
    throw badRequest(
      "PAYMENT_NOT_REFUNDABLE",
      "Only successful payments can be refunded.",
    );
  if (i.amount > Number(payment.amount))
    throw badRequest(
      "REFUND_AMOUNT_EXCEEDS_PAYMENT",
      "Refund amount exceeds payment amount.",
    );
  return prisma.$transaction(async (tx) => {
    const refund = await tx.refund.create({
      data: {
        orderId: payment.orderId,
        paymentId: payment.id,
        status: RefundStatus.REQUESTED,
        amount: i.amount,
        reason: i.reason,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: p.actorUserId,
        action: "PAYMENT_REFUND_REQUESTED",
        entityType: "Refund",
        entityId: refund.id,
        after: { paymentId: p.paymentId, amount: i.amount },
      },
    });
    return refund;
  });
};
