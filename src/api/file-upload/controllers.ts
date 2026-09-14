import type Koa from "koa";

import {
  FilePurpose,
  type Prisma,
} from "@prisma/client";

import * as service from "./service/index.js";

import {
  hasPermission,
} from "../../permissions/rbac.js";

import type {
  AuthenticatedUserClaims,
} from "../../types/context.js";

import {
  badRequest,
} from "../../types/app-errors.js";

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

type UploadedFile = {
  filepath?: string;
  path?: string;

  originalFilename?: string;
  name?: string;
  newFilename?: string;

  mimetype?: string;
  type?: string;

  size?: number;
};

type FileUploadState = {
  user?: AuthenticatedUserClaims | null;
  token?: string;
};

type FileUploadContext =
  Koa.ParameterizedContext<
    FileUploadState
  >;

/**
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

/**
 * Customers may upload these purposes
 * without an administrative files.upload
 * permission.
 */
const CUSTOMER_UPLOAD_PURPOSES =
  new Set<FilePurpose>([
    FilePurpose.USER_AVATAR,
    FilePurpose.RETURN_EVIDENCE,
  ]);

/**
 * Purposes managed by staff.
 */
const ADMIN_UPLOAD_PURPOSES =
  new Set<FilePurpose>([
    FilePurpose.PRODUCT_IMAGE,
    FilePurpose.BRAND_LOGO,
    FilePurpose.CATEGORY_IMAGE,
    FilePurpose.WARRANTY_DOCUMENT,
    FilePurpose.INVOICE,
    FilePurpose.OTHER,
  ]);

/**
 * ============================================================
 * SHARED HELPERS
 * ============================================================
 */

function getAuthenticatedUser(
  context: FileUploadContext,
): AuthenticatedUserClaims {
  const user =
    context.state.user;

  if (!user) {
    context.throw(
      401,
      "Authentication required",
    );
  }

  if (!user.isActive) {
    context.throw(
      403,
      "User account is inactive",
    );
  }

  return user;
}

function parseFilePurpose(
  value: unknown,
): FilePurpose {
  const purpose =
    String(value ?? "")
      .trim()
      .toUpperCase();

  const validPurposes =
    Object.values(
      FilePurpose,
    ) as string[];

  if (
    !purpose ||
    !validPurposes.includes(
      purpose,
    )
  ) {
    throw badRequest(
      "INVALID_FILE_PURPOSE",
      `Invalid file purpose. Allowed values: ${validPurposes.join(", ")}`,
    );
  }

  return purpose as FilePurpose;
}

function getRequestBody(
  context: FileUploadContext,
): Record<string, any> {
  const body =
    context.request.body;

  if (
    !body ||
    typeof body !== "object"
  ) {
    return {};
  }

  return body as Record<
    string,
    any
  >;
}

function getUploadedFiles(
  context: FileUploadContext,
): UploadedFile[] {
  const request =
    context.request as typeof context.request & {
      files?: Record<
        string,
        UploadedFile |
          UploadedFile[] |
          undefined
      >;
    };

  const files =
    request.files ?? {};

  const uploaded =
    files.file ??
    files.files;

  if (!uploaded) {
    return [];
  }

  return Array.isArray(
    uploaded,
  )
    ? uploaded
    : [uploaded];
}

function getSingleUploadedFile(
  context: FileUploadContext,
): UploadedFile {
  const files =
    getUploadedFiles(
      context,
    );

  if (files.length === 0) {
    context.throw(
      400,
      "No file was uploaded",
    );
  }

  if (files.length > 1) {
    context.throw(
      400,
      "Only one file may be uploaded at a time",
    );
  }

  const file =
    files[0];

  if (!file) {
    context.throw(
      400,
      "No file was uploaded",
    );
  }

  return file;
}

function parseMetadata(
  value: unknown,
): Prisma.InputJsonValue | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  if (
    typeof value === "object"
  ) {
    return value as Prisma.InputJsonValue;
  }

  if (
    typeof value === "string"
  ) {
    try {
      return JSON.parse(
        value,
      ) as Prisma.InputJsonValue;
    } catch {
      throw badRequest(
        "INVALID_METADATA",
        "metadata must be valid JSON",
      );
    }
  }

  throw badRequest(
    "INVALID_METADATA",
    "metadata must be a JSON object",
  );
}

/**
 * Verify whether this authenticated user
 * may upload the requested purpose.
 *
 * Customer purposes:
 *
 * USER_AVATAR
 * RETURN_EVIDENCE
 *
 * Administrative purposes:
 *
 * PRODUCT_IMAGE
 * BRAND_LOGO
 * CATEGORY_IMAGE
 * WARRANTY_DOCUMENT
 * INVOICE
 * OTHER
 */
async function assertUploadPurposeAllowed(
  user: AuthenticatedUserClaims,
  purpose: FilePurpose,
): Promise<void> {
  /**
   * Normal customers can upload
   * customer-owned files.
   */
  if (
    CUSTOMER_UPLOAD_PURPOSES.has(
      purpose,
    )
  ) {
    return;
  }

  /**
   * All other purposes are staff-managed.
   */
  if (
    ADMIN_UPLOAD_PURPOSES.has(
      purpose,
    )
  ) {
    const permitted =
      await hasPermission({
        userId:
          user.id,

        action:
          "upload:files",
      });

    if (!permitted) {
      throw badRequest(
        "FILE_UPLOAD_FORBIDDEN",
        "You do not have permission to upload this file type.",
      );
    }

    return;
  }

  throw badRequest(
    "FILE_PURPOSE_NOT_SUPPORTED",
    "This file purpose is not supported.",
  );
}

/**
 * Owner may manage their own file.
 *
 * Otherwise files.delete is required.
 */
async function assertFileDeleteAllowed(
  user: AuthenticatedUserClaims,
  file: Awaited<
    ReturnType<
      typeof service.getFile
    >
  >,
): Promise<void> {
  const isOwner =
    file.uploadedByUserId ===
    user.id;

  if (
    isOwner &&
    CUSTOMER_UPLOAD_PURPOSES.has(
      file.purpose,
    )
  ) {
    return;
  }

  const permitted =
    await hasPermission({
      userId:
        user.id,

      action:
        "delete:files",
    });

  if (!permitted) {
    contextlessForbidden();
  }
}

function contextlessForbidden(): never {
  const error =
    new Error(
      "You do not have permission to delete this file.",
    ) as Error & {
      status?: number;
      code?: string;
    };

  error.status = 403;
  error.code = "FORBIDDEN";

  throw error;
}

/**
 * Prevent users from retrieving arbitrary
 * customer-owned assets.
 *
 * Staff with files.view may view all files.
 */
async function assertFileViewAllowed(
  user: AuthenticatedUserClaims,
  file: Awaited<
    ReturnType<
      typeof service.getFile
    >
  >,
): Promise<void> {
  if (
    file.uploadedByUserId ===
    user.id
  ) {
    return;
  }

  const permitted =
    await hasPermission({
      userId:
        user.id,

      action:
        "view:files",
    });

  if (!permitted) {
    contextlessForbidden();
  }
}

/**
 * ============================================================
 * UPLOAD
 * ============================================================
 */

/**
 * POST /files/upload
 *
 * multipart/form-data
 *
 * file    = actual file
 * purpose = PRODUCT_IMAGE | USER_AVATAR | ...
 * metadata = optional JSON
 */
export async function uploadFileController(
  context: FileUploadContext,
): Promise<void> {
  const user =
    getAuthenticatedUser(
      context,
    );

  const body =
    getRequestBody(
      context,
    );

  const purpose =
    parseFilePurpose(
      body.purpose,
    );

  await assertUploadPurposeAllowed(
    user,
    purpose,
  );

  const file =
    getSingleUploadedFile(
      context,
    );

  const metadata =
    parseMetadata(
      body.metadata,
    );

  const uploaded =
    await service.uploadFile({
      file,

      purpose,

      uploadedByUserId:
        user.id,

      metadata,
    });

  context.status = 201;

  context.body = {
    success: true,

    file:
      uploaded,
  };
}

/**
 * ============================================================
 * SIGNED UPLOAD
 * ============================================================
 */

/**
 * POST /files/signed-upload
 *
 * {
 *   purpose: "PRODUCT_IMAGE",
 *   originalName: "iphone-17.jpg",
 *   mimeType: "image/jpeg",
 *   sizeBytes: 124123,
 *   metadata: {}
 * }
 */
export async function createSignedUploadController(
  context: FileUploadContext,
): Promise<void> {
  const user =
    getAuthenticatedUser(
      context,
    );

  const body =
    getRequestBody(
      context,
    );

  const purpose =
    parseFilePurpose(
      body.purpose,
    );

  await assertUploadPurposeAllowed(
    user,
    purpose,
  );

  const originalName =
    String(
      body.originalName ??
        "",
    ).trim();

  const mimeType =
    String(
      body.mimeType ??
        "",
    )
      .trim()
      .toLowerCase();

  if (!originalName) {
    context.throw(
      400,
      "originalName is required",
    );
  }

  if (!mimeType) {
    context.throw(
      400,
      "mimeType is required",
    );
  }

  let sizeBytes:
    number | undefined;

  if (
    body.sizeBytes !==
    undefined
  ) {
    sizeBytes =
      Number(
        body.sizeBytes,
      );

    if (
      !Number.isFinite(
        sizeBytes,
      ) ||
      sizeBytes < 0
    ) {
      context.throw(
        400,
        "sizeBytes must be a valid non-negative number",
      );
    }
  }

  const metadata =
    parseMetadata(
      body.metadata,
    );

  const result =
    await service
      .createSignedUpload({
        purpose,

        originalName,

        mimeType,

        sizeBytes,

        uploadedByUserId:
          user.id,

        metadata,
      });

  context.status = 201;

  context.body = {
    success: true,

    ...result,
  };
}

/**
 * ============================================================
 * COMPLETE DIRECT UPLOAD
 * ============================================================
 */

/**
 * POST /files/:id/complete
 */
export async function completeUploadController(
  context: FileUploadContext,
): Promise<void> {
  const user =
    getAuthenticatedUser(
      context,
    );

  const id =
    String(
      context.params.id ??
        "",
    ).trim();

  if (!id) {
    context.throw(
      400,
      "File upload ID is required",
    );
  }

  const file =
    await service
      .completeUpload({
        fileUploadId:
          id,

        userId:
          user.id,
      });

  context.status = 200;

  context.body = {
    success: true,

    file,
  };
}

/**
 * ============================================================
 * GET FILE
 * ============================================================
 */

/**
 * GET /files/:id
 */
export async function getFileController(
  context: FileUploadContext,
): Promise<void> {
  const user =
    getAuthenticatedUser(
      context,
    );

  const id =
    String(
      context.params.id ??
        "",
    ).trim();

  if (!id) {
    context.throw(
      400,
      "File ID is required",
    );
  }

  const file =
    await service.getFile(
      id,
    );

  await assertFileViewAllowed(
    user,
    file,
  );

  context.status = 200;

  context.body = {
    success: true,

    file,
  };
}

/**
 * ============================================================
 * DOWNLOAD URL
 * ============================================================
 */

/**
 * POST /files/:id/download-url
 *
 * {
 *   expiresIn: 300
 * }
 */
export async function createDownloadUrlController(
  context: FileUploadContext,
): Promise<void> {
  const user =
    getAuthenticatedUser(
      context,
    );

  const id =
    String(
      context.params.id ??
        "",
    ).trim();

  if (!id) {
    context.throw(
      400,
      "File ID is required",
    );
  }

  const file =
    await service.getFile(
      id,
    );

  await assertFileViewAllowed(
    user,
    file,
  );

  const body =
    getRequestBody(
      context,
    );

  const expiresIn =
    body.expiresIn !==
    undefined
      ? Number(
          body.expiresIn,
        )
      : undefined;

  if (
    expiresIn !== undefined &&
    (!Number.isFinite(
      expiresIn,
    ) ||
      expiresIn <= 0)
  ) {
    context.throw(
      400,
      "expiresIn must be a positive number",
    );
  }

  const result =
    await service
      .createDownloadUrl({
        id,

        expiresIn,
      });

  context.status = 200;

  context.body = {
    success: true,

    ...result,
  };
}

/**
 * ============================================================
 * DELETE
 * ============================================================
 */

/**
 * DELETE /files/:id
 */
export async function deleteFileController(
  context: FileUploadContext,
): Promise<void> {
  const user =
    getAuthenticatedUser(
      context,
    );

  const id =
    String(
      context.params.id ??
        "",
    ).trim();

  if (!id) {
    context.throw(
      400,
      "File ID is required",
    );
  }

  const existing =
    await service.getFile(
      id,
    );

  await assertFileDeleteAllowed(
    user,
    existing,
  );

  const deleted =
    await service.deleteFile({
      id,

      deletedByUserId:
        user.id,
    });

  context.status = 200;

  context.body = {
    success: true,

    file:
      deleted,
  };
}