import Router from "@koa/router";
import {
  listOrdersController,
  listMyOrdersController,
  getOrderController,
  checkoutController,
  updateOrderStatusController,
  cancelOrderController,
} from "./controllers.js";
import { requireAuthenticatedUser } from "src/middleware/auth.js";
import { requirePermission } from "src/middleware/permission.js";

const router = new Router({ prefix: "/orders" });
router.get("/me", requireAuthenticatedUser, listMyOrdersController);
router.post("/checkout", requireAuthenticatedUser, checkoutController);
router.get(
  "/",
  requireAuthenticatedUser,
  requirePermission("read:orders"),
  listOrdersController,
);
router.get("/:id", requireAuthenticatedUser, getOrderController);
router.patch(
  "/:id/status",
  requireAuthenticatedUser,
  requirePermission("update:orders"),
  updateOrderStatusController,
);
router.post(
  "/:id/cancel",
  requireAuthenticatedUser,
  requirePermission("cancel:orders"),
  cancelOrderController,
);
export default router;
