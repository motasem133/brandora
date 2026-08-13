import { basePath } from '@/lib/site-url'
import { getPublishedSite } from '@/server/db/queries/sites'

/**
 * A customer's own robots.txt.
 *
 * Everything is allowed — this is a small business's website and every page on
 * it exists to be found. Its real job is the last line: a crawler looks here
 * for the sitemap before it looks anywhere else, and a sitemap nothing points
 * at is a file nobody reads.
 *
 * `/api/site-image/` is disallowed rather than hidden. Those URLs redirect to
 * signed links that expire in five minutes, so an indexed one is a dead image
 * in an image search a few minutes after it was crawled. The pictures are still
 * indexed where they belong — inside the pages that show them.
 *
 * An unpublished or unknown host answers 404 rather than handing out a
 * permissive file for a site that does not exist.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params

  const site = await getPublishedSite(decodeURIComponent(subdomain))
  if (!site) return new Response('Not found', { status: 404 })

  const host = request.headers.get('host')
  const base = basePath(host, subdomain)
  const sitemap = host ? `https://${host}${base}/sitemap.xml` : `${base}/sitemap.xml`

  return new Response(
    `User-agent: *
Allow: /
Disallow: /api/site-image/

Sitemap: ${sitemap}
`,
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    },
  )
}
