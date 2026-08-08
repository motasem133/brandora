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

/**
 * Where to point an `<img>` at a generated file.
 *
 * The CDN when the bucket has a public domain, and the app's own file route
 * when it does not — which is the deployment that has no `R2_PUBLIC_URL` set,
 * where every asset has to be served through a signed redirect instead.
 *
 * One function because the expression was written out in seven components, and
 * a fallback repeated seven times is a fallback six of them can forget. The
 * route it falls back to is also the one carrying the tenant check, so a
 * component that skipped the fallback and hard-coded a CDN path would be
 * serving private assets without one.
 */
export function assetSrc(file: { id: string; r2Key: string }): string {
  return publicUrl(file.r2Key) ?? `/api/files/${file.id}`
}

/**
 * Time-limited URL for private objects such as the brand kit ZIP.
 *
 * `filename` turns the response into a download rather than a page.
 *
 * Without it R2 answers with no Content-Disposition, the browser recognises
 * image/png and renders it, and "Download" navigates away to a picture instead
 * of saving a file. The `download` attribute on the anchor cannot fix this:
 * it is ignored once a navigation crosses to another origin, which this one
 * always does — the link redirects to the bucket. The header is the only thing
 * that survives the redirect, so the instruction has to be signed into the URL.
 */
export async function signedDownloadUrl(
  key: string,
  { expiresInSeconds = 300, filename }: { expiresInSeconds?: number; filename?: string } = {},
) {
  const client = getClient()

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      // Quotes and backslashes would end the header value early, and a newline
      // would let a crafted filename inject one of its own.
      ResponseContentDisposition: filename
        ? `attachment; filename="${filename.replace(/["\\\r\n]/g, '')}"`
        : undefined,
    }),
    { expiresIn: expiresInSeconds },
  )
}
