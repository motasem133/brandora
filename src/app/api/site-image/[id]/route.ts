import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/server/db'
import { generatedFiles, projects, websiteAssets } from '@/server/db/schema'
import { signedDownloadUrl } from '@/server/storage/r2'

/**
 * A generated image, served to the public — but only the ones a published site
 * is entitled to show.
 *
 * The site is the one surface of this product with no session, and `/api/files`
 * is the opposite: it calls `requireOrg()`, scopes every read to the viewer's
 * own organization, and enforces the paid `vectorExport` gate on SVGs. That is
 * correct for the app and unusable for a customer's own website, which is why
 * every published site has had no photography and no logo since it shipped.
 *
 * The naive fix was to make the bucket public, and it was rejected earlier for
 * good reasons: it exposes brand-kit ZIPs by key and hands out the vector
 * exports the pricing page sells. This route keeps the bucket private and
 * authorises through a join instead of a session — a file is servable only if
 * it belongs to a project whose site is *published*, and only if its kind is on
 * the allowlist below.
 *
 * Two consequences worth stating. Unpublishing a site takes its images offline,
 * which is what a customer expects "unpublish" to mean. And the allowlist is a
 * structural guarantee rather than a policy: `logo_svg` and the kit archives
 * cannot be reached through here even with a valid id.
 *
 * It lives under `/api` deliberately — `src/proxy.ts` excludes that prefix from
 * the matcher, so this path resolves unrewritten from a subdomain and from a
 * customer's own domain with no proxy change.
 */
const PUBLIC_KINDS = ['social_scene', 'logo_raster', 'favicon', 'social_avatar', 'social_post'] as const

/** Below the signature's lifetime, or the redirect outlives the URL it points at. */
const SIGNATURE_SECONDS = 300
const CACHE_SECONDS = 240

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response('Not found', { status: 404 })
  }

  const [file] = await db
    .select({ key: generatedFiles.r2Key, mimeType: generatedFiles.mimeType })
    .from(generatedFiles)
    .innerJoin(projects, eq(projects.id, generatedFiles.projectId))
    .innerJoin(websiteAssets, eq(websiteAssets.projectId, projects.id))
    .where(
      and(
        eq(generatedFiles.id, id),
        eq(websiteAssets.isPublished, true),
        inArray(generatedFiles.kind, [...PUBLIC_KINDS]),
      ),
    )
    .limit(1)

  if (!file) return new Response('Not found', { status: 404 })

  /* The redirect is cacheable; the signed URL it points at is not, which is why
     the cache window sits below the signature's lifetime. */
  return new Response(null, {
    status: 302,
    headers: {
      Location: await signedDownloadUrl(file.key, { expiresInSeconds: SIGNATURE_SECONDS }),
      'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
    },
  })
}

export const dynamic = 'force-dynamic'
