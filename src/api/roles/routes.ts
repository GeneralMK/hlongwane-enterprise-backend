import Router from "@koa/router";
import {
  listRolesController,
  assignRoleController,
  revokeRoleController,
} from "./controllers.js";
import { requireAuthenticatedUser } from "src/middleware/auth.js";
import { requirePermission } from "src/middleware/permission.js";

const router = new Router({ prefix: "/roles" });
router.get(
  "/",
  requireAuthenticatedUser,
  requirePermission("read:admins"),
  listRolesController,
);
router.post(
  "/users/:userId",
  requireAuthenticatedUser,
  requirePermission("assign_roles:admins"),
  assignRoleController,
);
router.delete(
  "/users/:userId/:roleId",
  requireAuthenticatedUser,
  requirePermission("revoke_roles:admins"),
  revokeRoleController,
);
export default router;
