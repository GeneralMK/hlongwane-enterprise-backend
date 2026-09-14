import type Koa from "koa";
import { logger } from "./logger";

export async function paystackRedirect(ctx: Koa.Context) {
  const q = ctx.query as Record<string, string | undefined>;

  const reference = q.reference || q.trxref;
  const status = (q.status || "").toLowerCase();

  if (!reference) {
    ctx.status = 400;
    ctx.body = "Missing reference";
    return;
  }

  const webUrl = process.env.APP_WEB_URL;
  if (!webUrl) {
    ctx.status = 500;
    ctx.body = "APP_WEB_URL_MISSING";
    return;
  }

  const SUCCESS_URL = `${webUrl}/paystack/callback`;
  const CANCEL_URL = `${webUrl}/paystack/callback-cancel`;

  try {
    const isSuccess = status === "success" || status === "";

    const target = isSuccess
      ? `${SUCCESS_URL}?reference=${encodeURIComponent(reference)}`
      : `${CANCEL_URL}?reference=${encodeURIComponent(reference)}&reason=${encodeURIComponent(
          status || "cancelled",
        )}`;

    ctx.status = 302;
    ctx.redirect(target);
  } catch (err) {
    logger("GET /paystack/redirect error", err);
    ctx.status = 302;
    ctx.redirect(
      `${CANCEL_URL}?reference=${encodeURIComponent(reference)}&reason=error`,
    );
  }
}
