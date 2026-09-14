import Router from "@koa/router";

import {
  registerController,
  meController,
} from "./controllers.js";

import {
  requireAuthenticatedUser,
} from "../../middleware/auth.js";

const router = new Router({
  prefix: "/auth",
});

router.post(
  "/register",
  registerController,
);

router.get(
  "/me",
  requireAuthenticatedUser,
  meController,
);

export default router;