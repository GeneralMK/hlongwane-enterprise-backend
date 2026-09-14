import crypto from "node:crypto";
import prisma from "prisma";
import { OrderStatus, PaymentProvider, PaymentStatus, StockMovementType } from "@prisma/client";
import { badRequest, notFound } from "../../../errors/app-error.js";

const stableHash = (body: string) =>
  crypto.createHash("sha256").update(body).digest("hex");

export const verifyPaystackSignature = (rawBody: string, signature?: string) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

export const processSuccessfulPayment = async (p: {
  provider: PaymentProvider;
  reference: string;
  providerEventId?: string;
  eventType: string;
  rawBody: string;
  payload: any;
  signatureValid: boolean;
  amountMinor?: number;
}) => {
  if (!p.signatureValid) throw badRequest("INVALID_WEBHOOK_SIGNATURE", "Invalid webhook signature.");

  const payment = await prisma.payment.findUnique({
    where: { reference: p.reference },
    include: {
      order: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!payment || payment.provider !== p.provider) {
    throw notFound("PAYMENT_NOT_FOUND", "Payment not found.");
  }

  if (p.amountMinor !== undefined) {
    const expectedMinor = Math.round(Number(payment.amount) * 100);
    if (expectedMinor !== p.amountMinor) {
      throw badRequest("PAYMENT_AMOUNT_MISMATCH", "Provider amount does not match the order payment amount.");
    }
  }

  const idempotencyKey = p.providerEventId ?? `${p.provider}:${p.reference}:${p.eventType}:${stableHash(p.rawBody)}`;
  const duplicate = await prisma.paymentEvent.findUnique({ where: { idempotencyKey } });
  if (duplicate?.processedAt) return { duplicate: true, paymentId: payment.id };

  return prisma.$transaction(async (tx) => {
    const event = await tx.paymentEvent.upsert({
      where: { idempotencyKey },
      update: { signatureValid: p.signatureValid, payload: p.payload },
      create: {
        paymentId: payment.id,
        providerEventId: p.providerEventId,
        idempotencyKey,
        eventType: p.eventType,
        signatureValid: p.signatureValid,
        payload: p.payload,
      },
    });

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          verifiedAt: new Date(),
          paidAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAID, paidAt: new Date() },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: payment.orderId, status: OrderStatus.PAID, note: `Payment confirmed by ${p.provider}` },
      });

      const reservations = await tx.inventoryReservation.findMany({
        where: { orderId: payment.orderId, status: "ACTIVE" },
      });

      for (const reservation of reservations) {
        const inv = await tx.inventory.findUniqueOrThrow({ where: { variantId: reservation.variantId } });
        await tx.inventory.update({
          where: { variantId: reservation.variantId },
          data: {
            physicalQuantity: { decrement: reservation.quantity },
            reservedQuantity: { decrement: reservation.quantity },
            soldQuantity: { increment: reservation.quantity },
          },
        });
        await tx.inventoryReservation.update({
          where: { id: reservation.id },
          data: { status: "CONSUMED", consumedAt: new Date() },
        });
        await tx.stockMovement.create({
          data: {
            variantId: reservation.variantId,
            type: StockMovementType.SOLD,
            quantity: reservation.quantity,
            previousPhysicalQuantity: inv.physicalQuantity,
            resultingPhysicalQuantity: inv.physicalQuantity - reservation.quantity,
            previousReservedQuantity: inv.reservedQuantity,
            resultingReservedQuantity: inv.reservedQuantity - reservation.quantity,
            referenceType: "ORDER",
            referenceId: payment.orderId,
          },
        });
      }
    }

    await tx.paymentEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date() },
    });

    return { duplicate: false, paymentId: payment.id };
  });
};
