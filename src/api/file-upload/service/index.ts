import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  FilePurpose,
  StorageProvider,
  UploadStatus,
  type Prisma,
} from "@prisma/client";

import prisma from "prisma";

import { supabaseAdmin } from "../../../lib/supabase.js";

import { badRequest, notFound } from "../../../types/app-errors.js";

/**
 * Hlongwane Enterprise file upload service.
 *
 * Storage:
 * Supabase Storage
 *
 * Database:
 * Prisma FileUpload
 */

const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET?.trim() || "hlongwane-enterprise";

const MAX_IMAGE_SIZE =
  Number(process.env.MAX_IMAGE_UPLOAD_SIZE) || 10 * 1024 * 1024;

const MAX_DOCUMENT_SIZE =
  Number(process.env.MAX_DOCUMENT_UPLOAD_SIZE) || 20 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const DOCUMENT_MIME_TYPES = new Set(["application/pdf", ...IMAGE_MIME_TYPES]);

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

const DOCUMENT_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);

type IncomingFile = {
  filepath?: string;
  path?: string;

  originalFilename?: string;
  name?: string;
  newFilename?: string;

  mimetype?: string;
  type?: string;

  size?: number;
};

type ValidatedFile = {
  originalName: string;

  filepath: string;

  mimeType: string;

  extension: string;

  sizeBytes: number;
};

type UploadFileParams = {
  file: IncomingFile;

  purpose: FilePurpose;

  uploadedByUserId: string;

  metadata?: Prisma.InputJsonValue;
};

type CreateSignedUploadParams = {
  purpose: FilePurpose;

  originalName: string;

  mimeType: string;

  sizeBytes?: number;

  uploadedByUserId: string;

  metadata?: Prisma.InputJsonValue;
};

const PURPOSE_PATHS: Record<FilePurpose, string> = {
  PRODUCT_IMAGE: "products",

  BRAND_LOGO: "brands",

  CATEGORY_IMAGE: "categories",

  USER_AVATAR: "avatars",

  RETURN_EVIDENCE: "returns/evidence",

  WARRANTY_DOCUMENT: "warranties",

  INVOICE: "invoices",

  OTHER: "uploads",
};

/**
 * File types that normal customers
 * may upload themselves.
 */
const CUSTOMER_PURPOSES = new Set<FilePurpose>([
  FilePurpose.USER_AVATAR,
  FilePurpose.RETURN_EVIDENCE,
]);

/**
 * File types controlled by staff.
 */
const ADMIN_PURPOSES = new Set<FilePurpose>([
  FilePurpose.PRODUCT_IMAGE,
  FilePurpose.BRAND_LOGO,
  FilePurpose.CATEGORY_IMAGE,
  FilePurpose.WARRANTY_DOCUMENT,
  FilePurpose.INVOICE,
]);

export function isCustomerUploadPurpose(purpose: FilePurpose): boolean {
  return CUSTOMER_PURPOSES.has(purpose);
}

export function isAdminUploadPurpose(purpose: FilePurpose): boolean {
  return ADMIN_PURPOSES.has(purpose);
}

function sanitizeFilename(filename: string): string {
  const extension = path.extname(filename).toLowerCase();

  const basename = path
    .basename(filename, extension)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${basename || "file"}${extension}`;
}

function normalizeExtension(filename: string): string {
  return path.extname(filename).replace(/^\./, "").trim().toLowerCase();
}

function getOriginalName(file: IncomingFile): string {
  return String(
    file.originalFilename ?? file.name ?? file.newFilename ?? "upload",
  ).trim();
}

function getTemporaryPath(file: IncomingFile): string {
  return String(file.filepath ?? file.path ?? "").trim();
}

function getMimeType(file: IncomingFile): string {
  return String(file.mimetype ?? file.type ?? "")
    .trim()
    .toLowerCase();
}

function getSizeBytes(file: IncomingFile): number {
  return Number(file.size ?? 0);
}

function validateFile(file: IncomingFile, purpose: FilePurpose): ValidatedFile {
  const originalName = getOriginalName(file);

  const filepath = getTemporaryPath(file);

  const mimeType = getMimeType(file);

  const sizeBytes = getSizeBytes(file);

  const extension = normalizeExtension(originalName);

  if (!filepath) {
    throw badRequest(
      "FILE_PATH_MISSING",
      "Temporary upload file path is missing.",
    );
  }

  if (!originalName) {
    throw badRequest("FILE_NAME_REQUIRED", "File name is required.");
  }

  if (!mimeType) {
    throw badRequest("FILE_TYPE_REQUIRED", "File MIME type is required.");
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw badRequest("EMPTY_FILE", "Uploaded file is empty.");
  }

  const imageOnly =
    purpose === FilePurpose.PRODUCT_IMAGE ||
    purpose === FilePurpose.BRAND_LOGO ||
    purpose === FilePurpose.CATEGORY_IMAGE ||
    purpose === FilePurpose.USER_AVATAR;

  if (imageOnly) {
    if (!IMAGE_MIME_TYPES.has(mimeType)) {
      throw badRequest(
        "INVALID_IMAGE_TYPE",
        "Only JPG, JPEG, PNG and WebP images are allowed.",
      );
    }

    if (!IMAGE_EXTENSIONS.has(extension)) {
      throw badRequest(
        "INVALID_IMAGE_EXTENSION",
        "Unsupported image extension.",
      );
    }

    if (sizeBytes > MAX_IMAGE_SIZE) {
      throw badRequest(
        "IMAGE_TOO_LARGE",
        `Image exceeds the maximum size of ${Math.round(
          MAX_IMAGE_SIZE / 1024 / 1024,
        )} MB.`,
      );
    }
  } else {
    if (!DOCUMENT_MIME_TYPES.has(mimeType)) {
      throw badRequest("INVALID_FILE_TYPE", "Unsupported file type.");
    }

    if (!DOCUMENT_EXTENSIONS.has(extension)) {
      throw badRequest("INVALID_FILE_EXTENSION", "Unsupported file extension.");
    }

    if (sizeBytes > MAX_DOCUMENT_SIZE) {
      throw badRequest(
        "FILE_TOO_LARGE",
        `File exceeds the maximum size of ${Math.round(
          MAX_DOCUMENT_SIZE / 1024 / 1024,
        )} MB.`,
      );
    }
  }

  return {
    originalName,
    filepath,
    mimeType,
    extension,
    sizeBytes,
  };
}

function buildStoragePath(params: {
  purpose: FilePurpose;

  uploadedByUserId: string;

  originalName: string;
}): string {
  const basePath = PURPOSE_PATHS[params.purpose];

  const now = new Date();

  const year = String(now.getUTCFullYear());

  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  const safeFilename = sanitizeFilename(params.originalName);

  return [
    basePath,

    params.uploadedByUserId,

    year,

    month,

    `${crypto.randomUUID()}-${safeFilename}`,
  ].join("/");
}

async function fileExists(filepath: string): Promise<boolean> {
  try {
    await fs.promises.access(filepath, fs.constants.R_OK);

    return true;
  } catch {
    return false;
  }
}

async function calculateChecksum(filepath: string): Promise<string> {
  const buffer = await fs.promises.readFile(filepath);

  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function removeTemporaryFile(filepath: string): Promise<void> {
  if (!filepath) {
    return;
  }

  try {
    await fs.promises.unlink(filepath);
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      console.error("REMOVE_TEMP_FILE_ERROR", {
        filepath,

        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function getPublicUrl(storagePath: string): string | null {
  const { data } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl ?? null;
}

/**
 * Upload a multipart file to
 * Supabase Storage.
 */
export async function uploadFile(params: UploadFileParams) {
  const validated = validateFile(params.file, params.purpose);

  const exists = await fileExists(validated.filepath);

  if (!exists) {
    throw badRequest(
      "UPLOAD_FILE_NOT_FOUND",
      "Temporary upload file could not be read.",
    );
  }

  const storagePath = buildStoragePath({
    purpose: params.purpose,

    uploadedByUserId: params.uploadedByUserId,

    originalName: validated.originalName,
  });

  let recordId: string | undefined;

  try {
    const checksum = await calculateChecksum(validated.filepath);

    /**
     * Create DB record first.
     */
    const record = await prisma.fileUpload.create({
      data: {
        uploadedByUserId: params.uploadedByUserId,

        purpose: params.purpose,

        status: UploadStatus.UPLOADING,

        storageProvider: StorageProvider.SUPABASE,

        bucket: STORAGE_BUCKET,

        path: storagePath,

        originalName: validated.originalName,

        mimeType: validated.mimeType,

        extension: validated.extension,

        sizeBytes: BigInt(validated.sizeBytes),

        checksum,

        metadata: params.metadata,
      },
    });

    recordId = record.id;

    const buffer = await fs.promises.readFile(validated.filepath);

    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: validated.mimeType,

        upsert: false,

        cacheControl: "31536000",
      });

    if (error) {
      throw error;
    }

    const publicUrl = getPublicUrl(storagePath);

    return prisma.fileUpload.update({
      where: {
        id: record.id,
      },

      data: {
        status: UploadStatus.UPLOADED,

        publicUrl,

        uploadedAt: new Date(),
      },
    });
  } catch (error) {
    if (recordId) {
      await prisma.fileUpload
        .update({
          where: {
            id: recordId,
          },

          data: {
            status: UploadStatus.FAILED,
          },
        })
        .catch(() => undefined);
    }

    /**
     * Delete object if the DB update
     * failed after storage upload.
     */
    await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath])
      .catch(() => undefined);

    throw error;
  } finally {
    await removeTemporaryFile(validated.filepath);
  }
}

/**
 * Creates a signed upload URL.
 *
 * Useful for direct browser-to-Supabase
 * uploads without sending the file
 * through the Koa server.
 */
export async function createSignedUpload(params: CreateSignedUploadParams) {
  const extension = normalizeExtension(params.originalName);

  if (!extension) {
    throw badRequest("FILE_EXTENSION_REQUIRED", "File extension is required.");
  }

  const storagePath = buildStoragePath({
    purpose: params.purpose,

    uploadedByUserId: params.uploadedByUserId,

    originalName: params.originalName,
  });

  const record = await prisma.fileUpload.create({
    data: {
      uploadedByUserId: params.uploadedByUserId,

      purpose: params.purpose,

      status: UploadStatus.UPLOADING,

      storageProvider: StorageProvider.SUPABASE,

      bucket: STORAGE_BUCKET,

      path: storagePath,

      originalName: params.originalName,

      mimeType: params.mimeType,

      extension,

      sizeBytes: BigInt(params.sizeBytes ?? 0),

      metadata: params.metadata,
    },
  });

  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    await prisma.fileUpload.update({
      where: {
        id: record.id,
      },

      data: {
        status: UploadStatus.FAILED,
      },
    });

    throw badRequest(
      "SIGNED_UPLOAD_FAILED",
      error?.message ?? "Unable to create signed upload URL.",
    );
  }

  return {
    fileUpload: record,

    token: data.token,

    signedUrl: data.signedUrl,

    path: storagePath,
  };
}

/**
 * Mark a direct upload as complete.
 *
 * Should be called after the client
 * successfully uploads using the
 * signed URL.
 */
export async function completeUpload(params: {
  fileUploadId: string;

  userId: string;
}) {
  const record = await prisma.fileUpload.findUnique({
    where: {
      id: params.fileUploadId,
    },
  });

  if (!record) {
    throw notFound("FILE_NOT_FOUND", "File upload record not found.");
  }

  if (record.uploadedByUserId !== params.userId) {
    throw notFound("FILE_NOT_FOUND", "File upload record not found.");
  }

  const { data, error } = await supabaseAdmin.storage
    .from(record.bucket)
    .list(path.dirname(record.path), {
      search: path.basename(record.path),
    });

  if (error) {
    throw badRequest("FILE_VERIFICATION_FAILED", error.message);
  }

  const filename = path.basename(record.path);

  const exists = data.some((item) => item.name === filename);

  if (!exists) {
    throw badRequest(
      "UPLOAD_NOT_COMPLETED",
      "Uploaded object could not be found in storage.",
    );
  }

  const publicUrl = getPublicUrl(record.path);

  return prisma.fileUpload.update({
    where: {
      id: record.id,
    },

    data: {
      status: UploadStatus.UPLOADED,

      publicUrl,

      uploadedAt: new Date(),
    },
  });
}

/**
 * Fetch file metadata.
 */
export async function getFile(id: string) {
  const record = await prisma.fileUpload.findUnique({
    where: {
      id,
    },
  });

  if (!record || record.status === UploadStatus.DELETED) {
    throw notFound("FILE_NOT_FOUND", "File not found.");
  }

  return record;
}

/**
 * Create signed download URL.
 *
 * Useful for private buckets.
 */
export async function createDownloadUrl(params: {
  id: string;

  expiresIn?: number;
}) {
  const record = await getFile(params.id);

  const expiresIn = Math.min(Math.max(params.expiresIn ?? 300, 60), 3600);

  const { data, error } = await supabaseAdmin.storage
    .from(record.bucket)
    .createSignedUrl(record.path, expiresIn);

  if (error || !data) {
    throw badRequest(
      "DOWNLOAD_URL_FAILED",
      error?.message ?? "Unable to create download URL.",
    );
  }

  return {
    id: record.id,

    signedUrl: data.signedUrl,

    expiresIn,
  };
}

/**
 * Soft delete database metadata and
 * remove the underlying Supabase object.
 */
export async function deleteFile(params: {
  id: string;

  deletedByUserId: string;
}) {
  const record = await prisma.fileUpload.findUnique({
    where: {
      id: params.id,
    },
  });

  if (!record) {
    throw notFound("FILE_NOT_FOUND", "File not found.");
  }

  if (record.status === UploadStatus.DELETED) {
    return record;
  }

  const { error } = await supabaseAdmin.storage
    .from(record.bucket)
    .remove([record.path]);

  if (error) {
    throw badRequest("FILE_DELETE_FAILED", error.message);
  }

  return prisma.$transaction(async (tx) => {
    const deleted = await tx.fileUpload.update({
      where: {
        id: record.id,
      },

      data: {
        status: UploadStatus.DELETED,

        deletedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: params.deletedByUserId,

        action: "files.delete",

        entityType: "FileUpload",

        entityId: record.id,

        before: {
          status: record.status,

          path: record.path,

          purpose: record.purpose,
        },

        after: {
          status: UploadStatus.DELETED,
        },
      },
    });

    return deleted;
  });
}
