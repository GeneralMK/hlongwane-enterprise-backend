import Router from "@koa/router";

import {
  requireAuthenticatedUser,
} from "../../middleware/auth.js";

import {
  uploadFileController,
  createSignedUploadController,
  completeUploadController,
  getFileController,
  createDownloadUrlController,
  deleteFileController,
} from "./controllers.js";

const router = new Router({
  prefix: "/files",
});

/**
 * ============================================================
 * FILE UPLOADS
 * ============================================================
 *
 * Authentication:
 * Supabase access token
 *
 * Authorization:
 * Purpose-specific authorization is handled by the controller.
 *
 * Customers may upload:
 * - USER_AVATAR
 * - RETURN_EVIDENCE
 *
 * Staff with files.upload may upload:
 * - PRODUCT_IMAGE
 * - BRAND_LOGO
 * - CATEGORY_IMAGE
 * - WARRANTY_DOCUMENT
 * - INVOICE
 * - OTHER
 */

/**
 * Upload file through the backend.
 *
 * POST /files/upload
 *
 * multipart/form-data:
 *
 * file=<binary>
 * purpose=PRODUCT_IMAGE | BRAND_LOGO | CATEGORY_IMAGE |
 *         USER_AVATAR | RETURN_EVIDENCE |
 *         WARRANTY_DOCUMENT | INVOICE | OTHER
 */
router.post(
  "/upload",
  requireAuthenticatedUser,
  uploadFileController,
);

/**
 * ============================================================
 * DIRECT-TO-SUPABASE UPLOAD
 * ============================================================
 *
 * Creates:
 * - FileUpload record
 * - signed Supabase upload URL
 *
 * The browser/mobile app can then upload directly
 * to Supabase Storage.
 *
 * POST /files/signed-upload
 */
router.post(
  "/signed-upload",
  requireAuthenticatedUser,
  createSignedUploadController,
);

/**
 * Confirm that a direct upload completed successfully.
 *
 * POST /files/:id/complete
 */
router.post(
  "/:id/complete",
  requireAuthenticatedUser,
  completeUploadController,
);

/**
 * ============================================================
 * FILE METADATA
 * ============================================================
 *
 * GET /files/:id
 */
router.get(
  "/:id",
  requireAuthenticatedUser,
  getFileController,
);

/**
 * ============================================================
 * DOWNLOAD
 * ============================================================
 *
 * Generates a short-lived signed URL.
 *
 * Useful when Supabase Storage bucket is private.
 *
 * POST /files/:id/download-url
 */
router.post(
  "/:id/download-url",
  requireAuthenticatedUser,
  createDownloadUrlController,
);

/**
 * ============================================================
 * DELETE
 * ============================================================
 *
 * Authorization rules should be enforced by the controller:
 *
 * Customer:
 * - can delete their own USER_AVATAR
 * - can delete their own RETURN_EVIDENCE where allowed
 *
 * Staff:
 * - requires files.delete for managed assets
 *
 * DELETE /files/:id
 */
router.delete(
  "/:id",
  requireAuthenticatedUser,
  deleteFileController,
);

export default router;