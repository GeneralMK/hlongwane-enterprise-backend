import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'

import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { logger } from '.'

const bucketName = process.env.AWS_STORAGE_BUCKET
const region = process.env.AWS_DEFAULT_REGION || 'af-south-1'

const s3Client = new S3Client({ region })

export async function uploadObject(fileBuffer: any, fileName: string, mimetype: string) {
  const uploadParams = {
    Bucket: bucketName,
    Body: fileBuffer,
    Key: fileName,
    ContentType: mimetype
  }

  try {
    logger('UPLOAD_OBJECT', `[S3 Client] Uploading: ${fileName}`)
    const data = await s3Client.send(new PutObjectCommand(uploadParams))
    logger('UPLOAD_OBJECT_SUCCESS', data)
  } catch (error) {
    logger('UPLOAD_OBJECT_ERROR', error)
    throw new Error(`Error uploading file: ${error}`)
  }
}

export async function deleteObjectCommand(key: string) {
  const deleteParams = {
    Bucket: bucketName,
    Key: key
  }

  try {
    logger('DELETE_OBJECT', `[S3 Client] Deleting object with key: ${key}`)
    await s3Client.send(new DeleteObjectCommand(deleteParams))
    logger('DELETE_OBJECT_SUCCESS', `[S3 Client] Successfully deleted object with key: ${key}`)
  } catch (error) {
    logger('DELETE_OBJECT_ERROR', error)
  }
}

export async function getObjectSignedUrl(key: string) {
  const params = {
    Bucket: bucketName,
    Key: key
  }

  try {
    // https://aws.amazon.com/blogs/developer/generate-presigned-url-modular-aws-sdk-javascript/
    const command = new GetObjectCommand(params)
    const seconds = 1800
    const url = await getSignedUrl(s3Client, command, { expiresIn: seconds })
    return url
  } catch (error) {
    logger('GET_SIGNED_URL_ERROR', error)
    throw new Error(`Error generating signed URL: ${error}`)
  }
}

export async function copyObject(currentKey: string, copyKey: string) {
  const params = {
    Bucket: bucketName,
    CopySource: '/' + bucketName + '/' + currentKey,
    Key: copyKey
  }

  try {
    const results = await s3Client.send(new CopyObjectCommand(params))
    logger('COPY_OBJECT', { results })
  } catch (error) {
    logger('COPY_OBJECT_ERROR', error)
  }
}
