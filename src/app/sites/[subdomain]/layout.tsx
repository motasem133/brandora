import { and, eq } from 'drizzle-orm'

import { fontHref, resolveTheme } from '@/components/blocks/block-renderer'
import { isRtl } from '@/i18n/routing'
import type { Theme } from '@/lib/blocks'
import { db } from '@/server/db'
import { brandingAssets, projects, websiteAssets } from '@/server/db/schema'
import '../sites.css'

/**
 * Root layout for published customer sites.
 *
 * Next.js supports one root layout per top-level branch, so this sits alongside
 * the app's own under [locale]. Without it the /sites branch has no root
 * layout, and Next falls back to a synthetic error shell — which is what
 * produced `<html id="__next_error__">` and left stylesheets with nowhere to go.
 *
 * `lang` and `dir` come from the project's generation language, so an Arabic
 * brand's site renders right-to-left the way its content was written.
 */
export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ subdomain: string }>
}) {
  const { subdomain } = await params

  const [site] = await db
    .select({ language: projects.language, branding: brandingAssets })
    .from(websiteAssets)
    .innerJoin(projects, eq(projects.id, websiteAssets.projectId))
    .leftJoin(brandingAssets, eq(brandingAssets.projectId, websiteAssets.projectId))
    .where(and(eq(websiteAssets.subdomain, subdomain), eq(websiteAssets.isPublished, true)))
    .limit(1)

  const language = site?.language ?? 'en'

  const theme = resolveTheme({
    fontHeading: site?.branding?.fontRecommendations?.heading,
    fontBody: site?.branding?.fontRecommendations?.body,
  } as Theme)

  const fonts = fontHref(theme)

  return (
    <html lang={language} dir={isRtl(language) ? 'rtl' : 'ltr'}>
      <head>{fonts && <link rel="stylesheet" href={fonts} />}</head>
      <body>{children}</body>
    </html>
  )
}
