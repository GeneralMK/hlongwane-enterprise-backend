import Router from "@koa/router";

import { listAuditLogsController } from "./controllers.js";
import { requireAuthenticatedUser } from "src/middleware/auth.js";
import { requirePermission } from "src/middleware/permission.js";

const router = new Router({
  prefix: "/audit",
});

router.get(
  "/",

  requireAuthenticatedUser,

  requirePermission("view:audit"),

  listAuditLogsController,
);

export default router;
