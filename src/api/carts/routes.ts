import Router from "@koa/router";
import {
  getMyCartController,
  addCartItemController,
  updateCartItemController,
  removeCartItemController,
} from "./controllers.js";
import { requireAuthenticatedUser } from "src/middleware/auth.js";

const router = new Router({ prefix: "/carts" });
router.get("/me", requireAuthenticatedUser, getMyCartController);
router.post("/me/items", requireAuthenticatedUser, addCartItemController);
router.patch(
  "/me/items/:itemId",
  requireAuthenticatedUser,
  updateCartItemController,
);
router.delete(
  "/me/items/:itemId",
  requireAuthenticatedUser,
  removeCartItemController,
);
export default router;
