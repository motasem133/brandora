import { PAGE_KEYS, type Block, type PageKey } from '@/lib/blocks'
import { absoluteUrl } from '@/lib/site-url'
import { getPublishedSite } from '@/server/db/queries/sites'

/**
 * A customer's own sitemap.
 *
 * Worth having only since the pages got real URLs: for as long as four pages
 * shared one address there was one page to declare, and declaring it told a
 * crawler nothing it had not already found.
 *
 * The pages listed are the ones this site actually has and actually has content
 * on — the same filter the nav uses. A sitemap that lists a URL which 404s is
 * worse than no sitemap at all: it is a crawler's first impression of the
 * domain, and it is a broken one.
 *
 * A static segment, so it wins over the `[[...page]]` catch-all that serves the
 * pages. It reaches this route on a customer's own host because `proxy.ts`
 * matches `/sitemap.xml` explicitly — the matcher's file-extension rule would
 * otherwise skip it, leaving the request unrewritten and answering with the
 * app's own sitemap on the customer's domain.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params

  const site = await getPublishedSite(decodeURIComponent(subdomain))
  if (!site) return new Response('Not found', { status: 404 })

  const host = request.headers.get('host')
  const pages = (site.website.pages ?? {}) as Record<string, Block[]>
  /* A string, not a Date: the row comes back through `unstable_cache`, which
     serialises what it stores. It typechecks as a Date and is not one. */
  const updated = new Date(site.website.updatedAt ?? Date.now()).toISOString()

  const urls = PAGE_KEYS.filter((key) => pages[key]?.length)
    .map(
      (key: PageKey) => `  <url>
    <loc>${absoluteUrl(host, subdomain, key)}</loc>
    <lastmod>${updated}</lastmod>
    ${key === 'home' ? '<priority>1.0</priority>' : '<priority>0.8</priority>'}
  </url>`,
    )
    .join('\n')

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`,
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        /* A crawler is not in a hurry and the pages change rarely; this is the
           same window the site's own cache holds. */
        'Cache-Control': 'public, max-age=300',
      },
    },
  )
}
