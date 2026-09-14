import Router from "@koa/router";
import {
  listCategoriesController,
  getCategoryController,
  createCategoryController,
  updateCategoryController,
} from "./controllers.js";
import { requireAuthenticatedUser } from "src/middleware/auth.js";
import { requirePermission } from "src/middleware/permission.js";

const router = new Router({ prefix: "/categories" });
router.get("/", listCategoriesController);
router.get("/:id", getCategoryController);
router.post(
  "/",
  requireAuthenticatedUser,
  requirePermission("manage:categories"),
  createCategoryController,
);
router.patch(
  "/:id",
  requireAuthenticatedUser,
  requirePermission("manage:categories"),
  updateCategoryController,
);
export default router;
