import { fontHref, resolveTheme } from '@/components/blocks/block-renderer'
import { isRtl } from '@/i18n/routing'
import type { Theme } from '@/lib/blocks'
import { getPublishedSite } from '@/server/db/queries/sites'
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

  const site = await getPublishedSite(subdomain)
  const language = site?.project.language ?? 'en'

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
