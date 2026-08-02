import 'server-only'

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'

/**
 * Cloudflare R2 over the S3 API.
 *
 * R2 was chosen over Vercel Blob for one dominant reason: egress is free and
 * unmetered. Brandora serves logos, brand-kit ZIPs and published sites — assets
 * downloaded repeatedly — so egress, not storage, is the cost that scales.
 */
function getClient() {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new AppError('AI_PROVIDER_ERROR', 'R2 storage is not configured.')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })
}

export function isStorageConfigured() {
  return Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY)
}

/** Keys are namespaced by project so a project delete can sweep its prefix. */
export function objectKey(projectId: string, filename: string) {
  return `projects/${projectId}/${filename}`
}

export async function uploadObject(params: {
  key: string
  body: Buffer | Uint8Array | string
  contentType: string
  cacheControl?: string
}) {
  const client = getClient()

  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      // Generated assets are immutable once written — the key changes when the
      // content does, so they can be cached indefinitely.
      CacheControl: params.cacheControl ?? 'public, max-age=31536000, immutable',
    }),
  )

  return params.key
}

/** Public CDN URL, when the bucket is exposed through a domain. */
export function publicUrl(key: string): string | null {
  if (!env.R2_PUBLIC_URL) return null
  return `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
}

/** Time-limited URL for private objects such as the brand kit ZIP. */
export async function signedDownloadUrl(key: string, expiresInSeconds = 300) {
  const client = getClient()

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
    { expiresIn: expiresInSeconds },
  )
}
