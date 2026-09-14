import axios from "axios";
import { logger } from "src/utilities";

const PAYSTACK_SECRET =
  process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET || "";

if (!PAYSTACK_SECRET) {
  logger("PAYSTACK_SECRET_KEY_MISSING", {});
}

export async function verifyPaystackTransaction(reference: string) {
  logger("PAYSTACK_VERIFY_HTTP_CALL", { reference });

  const url = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;

  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    timeout: 10000,
  });

  logger("PAYSTACK_VERIFY_HTTP_RESPONSE_META", {
    httpStatus: res.status,
    ok: res.data?.status,
    message: res.data?.message,
  });

  return res.data;
}
