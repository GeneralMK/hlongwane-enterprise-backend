import Router from "@koa/router";
import {
  listInventoryController,
  getInventoryController,
  adjustInventoryController,
} from "./controllers.js";
import { requireAuthenticatedUser } from "src/middleware/auth.js";
import { requirePermission } from "src/middleware/permission.js";

const router = new Router({ prefix: "/inventory" });
router.get(
  "/",
  requireAuthenticatedUser,
  requirePermission("read:inventory"),
  listInventoryController,
);
router.get(
  "/:variantId",
  requireAuthenticatedUser,
  requirePermission("read:inventory"),
  getInventoryController,
);
router.post(
  "/:variantId/adjust",
  requireAuthenticatedUser,
  requirePermission("adjust:inventory"),
  adjustInventoryController,
);
export default router;
