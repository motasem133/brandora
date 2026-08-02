import { and, eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageRenderer, resolveTheme } from '@/components/blocks/block-renderer'
import { PAGE_KEYS, type Block, type PageKey, type Theme } from '@/lib/blocks'
import { db } from '@/server/db'
import { brandingAssets, projects, websiteAssets, type BrandingAsset } from '@/server/db/schema'

/** Maps a generated brand palette onto the renderer's theme shape. */
function themeFromBranding(branding: BrandingAsset | null): Theme {
  const palette = branding?.colorPalette
  const fonts = branding?.fontRecommendations

  return {
    primaryColor: palette?.primary,
    secondaryColor: palette?.secondary,
    backgroundColor: palette?.background,
    textColor: palette?.text,
    fontHeading: fonts?.heading,
    fontBody: fonts?.body,
  }
}

/**
 * Published customer websites.
 *
 * Deliberately outside the [locale] segment: these are the customer's own
 * sites, not part of the Brandora app, so they carry no app chrome, no locale
 * prefix and no session.
 */
async function getSite(subdomain: string) {
  const [row] = await db
    .select({ website: websiteAssets, project: projects, branding: brandingAssets })
    .from(websiteAssets)
    .innerJoin(projects, eq(projects.id, websiteAssets.projectId))
    .leftJoin(brandingAssets, eq(brandingAssets.projectId, websiteAssets.projectId))
    .where(and(eq(websiteAssets.subdomain, subdomain), eq(websiteAssets.isPublished, true)))
    .limit(1)

  return row ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>
}): Promise<Metadata> {
  const { subdomain } = await params
  const site = await getSite(subdomain)
  if (!site) return { title: 'Not found' }

  const name = site.project.businessName || site.project.title

  return {
    title: name,
    description: site.branding?.slogan ?? undefined,
    robots: { index: true, follow: true },
  }
}

export default async function PublishedSite({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { subdomain } = await params
  const { page } = await searchParams

  const site = await getSite(subdomain)
  if (!site) notFound()

  /*
   * Branding is the source of truth for colours and type; customStyles holds
   * only explicit overrides made in the builder. Snapshotting the palette at
   * generation time would leave a published site on stale colours after the
   * brand identity is regenerated.
   */
  const theme = resolveTheme({ ...themeFromBranding(site.branding), ...(site.website.customStyles as Theme) })
  const pages = (site.website.pages ?? {}) as Record<string, Block[]>

  const active: PageKey = PAGE_KEYS.includes(page as PageKey) ? (page as PageKey) : 'home'
  const blocks = pages[active] ?? []
  const nav = PAGE_KEYS.filter((key) => pages[key]?.length)

  const name = site.project.businessName || site.project.title

  // Fonts are linked from the layout's <head>, where React can resolve their
  // precedence without being told.
  return (
    <div style={{ backgroundColor: theme.backgroundColor, minHeight: '100dvh' }}>
        <header
          className="flex flex-wrap items-center justify-between gap-4 px-8 py-5"
          style={{ borderBottom: `1px solid ${theme.primaryColor}1a` }}
        >
          <span
            className="text-lg font-bold"
            style={{ fontFamily: `'${theme.fontHeading}', sans-serif`, color: theme.primaryColor }}
          >
            {name}
          </span>

          <nav className="flex gap-5">
            {nav.map((key) => (
              <a
                key={key}
                /*
                 * Query-only hrefs resolve against the current URL, so the same
                 * markup works at /sites/acme and at acme.brandora.enigmitic.com.
                 * An absolute /sites/... link would be rewritten a second time on
                 * a subdomain host and 404.
                 */
                href={`?page=${key}`}
                className="text-sm capitalize hover:underline"
                style={{
                  fontFamily: `'${theme.fontBody}', sans-serif`,
                  color: theme.textColor,
                  opacity: key === active ? 1 : 0.7,
                }}
              >
                {key}
              </a>
            ))}
          </nav>
        </header>

        <PageRenderer blocks={blocks} theme={theme} />

        <footer
          className="px-8 py-10 text-center text-sm"
          style={{
            fontFamily: `'${theme.fontBody}', sans-serif`,
            color: theme.textColor,
            opacity: 0.6,
            borderTop: `1px solid ${theme.primaryColor}1a`,
          }}
        >
          © {new Date().getFullYear()} {name}
      </footer>
    </div>
  )
}
