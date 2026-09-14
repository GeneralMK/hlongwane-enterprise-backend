import Router from "@koa/router";
import {
  getPaymentController,
  getPaymentByReferenceController,
  initializeCheckoutController,
  requestRefundController,
} from "./controllers.js";
import { requireAuthenticatedUser } from "src/middleware/auth.js";
import { requirePermission } from "src/middleware/permission.js";
const router = new Router({ prefix: "/payments" });
router.post(
  "/checkout",
  requireAuthenticatedUser,
  initializeCheckoutController,
);
router.get(
  "/reference/:reference",
  requireAuthenticatedUser,
  requirePermission("read:payments"),
  getPaymentByReferenceController,
);
router.get(
  "/:id",
  requireAuthenticatedUser,
  requirePermission("read:payments"),
  getPaymentController,
);
router.post(
  "/:id/refund",
  requireAuthenticatedUser,
  requirePermission("refund:payments"),
  requestRefundController,
);
export default router;
