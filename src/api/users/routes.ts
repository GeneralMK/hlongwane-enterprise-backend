import Router from "@koa/router";
import {
  listUsersController,
  getUserController,
  updateUserController,
} from "./controllers.js";
import { requireAuthenticatedUser } from "src/middleware/auth.js";
import { requirePermission } from "src/middleware/permission.js";

const router = new Router({ prefix: "/users" });
router.get(
  "/",
  requireAuthenticatedUser,
  requirePermission("read:users"),
  listUsersController,
);
router.get(
  "/:id",
  requireAuthenticatedUser,
  requirePermission("read:users"),
  getUserController,
);
router.patch(
  "/:id",
  requireAuthenticatedUser,
  requirePermission("update:users"),
  updateUserController,
);
export default router;
