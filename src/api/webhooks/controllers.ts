import type { Context } from "koa";
import { PaymentProvider } from "@prisma/client";
import * as service from "./service/index.js";

const rawBody = (ctx: Context): string =>
  typeof (ctx.request as any).rawBody === "string"
    ? (ctx.request as any).rawBody
    : JSON.stringify(ctx.request.body ?? {});

export const paystackWebhookController = async (ctx: Context) => {
  const body: any = ctx.request.body ?? {};
  const raw = rawBody(ctx);
  const reference = body?.data?.reference;
  const eventType = body?.event ?? "unknown";
  const amountMinor = body?.data?.amount;
  const providerEventId = body?.data?.id ? String(body.data.id) : undefined;

  await service.processSuccessfulPayment({
    provider: PaymentProvider.PAYSTACK,
    reference,
    providerEventId,
    eventType,
    rawBody: raw,
    payload: body,
    signatureValid: service.verifyPaystackSignature(
      raw,
      ctx.headers["x-paystack-signature"] as string | undefined,
    ),
    amountMinor,
  });

  ctx.status = 200;
  ctx.body = { received: true };
};

/*
 * PAYFLEX/PAYFAST/OZOW signatures differ by provider.
 * These controllers intentionally reject until provider-specific verification
 * is implemented rather than accepting unverified callbacks.
 */
const unsupported = (provider: string) => async (ctx: Context) => {
  ctx.status = 501;
  ctx.body = {
    success: false,
    error: {
      code: "WEBHOOK_VERIFIER_NOT_IMPLEMENTED",
      message: `${provider} webhook verification is not implemented yet.`,
    },
  };
};

export const payflexWebhookController = unsupported("PAYFLEX");
export const payfastWebhookController = unsupported("PAYFAST");
export const ozowWebhookController = unsupported("OZOW");
