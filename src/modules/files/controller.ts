import { FilePurpose } from '@prisma/client'
import type { Context } from 'koa'
import { requireRestPermission, requireRestUser } from '../../auth/rest.js'
import { uploadFile } from './service.js'

const customerUploadPurposes = new Set<FilePurpose>([
  FilePurpose.USER_AVATAR,
  FilePurpose.RETURN_EVIDENCE
])

export async function uploadFileController(ctx: Context) {
  const purpose = String((ctx.request as any).body?.purpose ?? 'OTHER') as FilePurpose
  const user = customerUploadPurposes.has(purpose)
    ? requireRestUser(ctx)
    : requireRestPermission(ctx, 'files.upload')

  const files = (ctx.request as any).files as Record<string, any> | undefined
  const file = files?.file
  const selected = Array.isArray(file) ? file[0] : file
  if (!selected) ctx.throw(400, 'file is required')

  const uploaded = await uploadFile({
    tempPath: selected.filepath,
    originalName: selected.originalFilename ?? 'upload',
    mimeType: selected.mimetype ?? 'application/octet-stream',
    sizeBytes: selected.size,
    bucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'uploads',
    purpose,
    uploadedByUserId: user.id
  })

  ctx.status = 201
  ctx.body = { success: true, file: { ...uploaded, sizeBytes: uploaded.sizeBytes.toString() } }
}
