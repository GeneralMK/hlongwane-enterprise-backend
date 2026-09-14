import Router from "@koa/router";
import { listMyNotificationsController } from "./controllers.js";
import { requireAuthenticatedUser } from "src/middleware/auth.js";

const router = new Router({ prefix: "/notifications" });
router.get("/me", requireAuthenticatedUser, listMyNotificationsController);
export default router;
