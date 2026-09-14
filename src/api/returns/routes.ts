import Router from "@koa/router";
import {
  getReturnController,
  createReturnController,
  approveReturnController,
  rejectReturnController,
} from "./controllers.js";
import { requireAuthenticatedUser } from "src/middleware/auth.js";
import { requirePermission } from "src/middleware/permission.js";

const router = new Router({ prefix: "/returns" });
router.post("/", requireAuthenticatedUser, createReturnController);
router.get("/:id", requireAuthenticatedUser, getReturnController);
router.post(
  "/:id/approve",
  requireAuthenticatedUser,
  requirePermission("approve:returns"),
  approveReturnController,
);
router.post(
  "/:id/reject",
  requireAuthenticatedUser,
  requirePermission("reject:returns"),
  rejectReturnController,
);
export default router;
