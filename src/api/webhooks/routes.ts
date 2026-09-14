import Router from "@koa/router";
import {
  paystackWebhookController,
  payflexWebhookController,
  payfastWebhookController,
  ozowWebhookController,
} from "./controllers.js";
const router = new Router({ prefix: "/webhooks" });
router.post("/paystack", paystackWebhookController);
router.post("/payflex", payflexWebhookController);
router.post("/payfast", payfastWebhookController);
router.post("/ozow", ozowWebhookController);
export default router;
