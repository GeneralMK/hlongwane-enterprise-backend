import Router from "@koa/router";
import {
  getShipmentController,
  createShipmentController,
  updateShipmentController,
} from "./controllers.js";
import { requireAuthenticatedUser } from "src/middleware/auth.js";
import { requirePermission } from "src/middleware/permission.js";


const router = new Router({ prefix: "/shipments" });
router.get("/:id", requireAuthenticatedUser, getShipmentController);
router.post(
  "/",
  requireAuthenticatedUser,
  requirePermission("update:shipments"),
  createShipmentController,
);
router.patch(
  "/:id",
  requireAuthenticatedUser,
  requirePermission("update:shipments"),
  updateShipmentController,
);
export default router;
