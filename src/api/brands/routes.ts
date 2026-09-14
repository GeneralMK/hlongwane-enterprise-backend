import Router from "@koa/router";

import {
  listBrandsController,
  getBrandController,
  createBrandController,
  updateBrandController,
} from "./controllers.js";

import { requireAuthenticatedUser } from "../../middleware/auth.js";

import { requirePermission } from "../../middleware/permission.js";

const router = new Router({
  prefix: "/brands",
});

/**
 * Public routes.
 */
router.get("/", listBrandsController);

router.get("/:id", getBrandController);

/**
 * Create brand.
 *
 * RBAC:
 * manage:brands
 * -> brands.manage
 */
router.post(
  "/",
  requireAuthenticatedUser,
  requirePermission("manage:brands"),
  createBrandController,
);

/**
 * Update brand.
 *
 * RBAC:
 * manage:brands
 * -> brands.manage
 */
router.patch(
  "/:id",
  requireAuthenticatedUser,
  requirePermission("manage:brands"),
  updateBrandController,
);

export default router;
