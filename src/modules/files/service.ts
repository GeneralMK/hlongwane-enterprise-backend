import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { FilePurpose, UploadStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { supabaseAdmin } from '../../lib/supabase.js'

export async function uploadFile(params: {
  tempPath: string
  originalName: string
  mimeType: string
  sizeBytes: number
  bucket: string
  purpose: FilePurpose
  uploadedByUserId?: string
}) {
  const ext = path.extname(params.originalName).toLowerCase() || undefined
  const storagePath = `${params.purpose.toLowerCase()}/${crypto.randomUUID()}${ext ?? ''}`

  const record = await prisma.fileUpload.create({
    data: {
      uploadedByUserId: params.uploadedByUserId,
      purpose: params.purpose,
      status: UploadStatus.PENDING,
      bucket: params.bucket,
      path: storagePath,
      originalName: params.originalName,
      mimeType: params.mimeType,
      extension: ext,
      sizeBytes: BigInt(params.sizeBytes)
    }
  })

  try {
    const bytes = await fs.readFile(params.tempPath)
    const { error } = await supabaseAdmin.storage.from(params.bucket).upload(storagePath, bytes, { contentType: params.mimeType, upsert: false })
    if (error) throw error
    const { data } = supabaseAdmin.storage.from(params.bucket).getPublicUrl(storagePath)

    return await prisma.fileUpload.update({
      where: { id: record.id },
      data: { status: UploadStatus.UPLOADED, publicUrl: data.publicUrl, uploadedAt: new Date() }
    })
  } catch (error) {
    await prisma.fileUpload.update({ where: { id: record.id }, data: { status: UploadStatus.FAILED } })
    throw error
  } finally {
    await fs.unlink(params.tempPath).catch(() => undefined)
  }
}
