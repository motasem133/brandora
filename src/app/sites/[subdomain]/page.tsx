import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { PageRenderer, resolveTheme } from '@/components/blocks/block-renderer'
import { PAGE_KEYS, type Block, type PageKey, type Theme } from '@/lib/blocks'
import { getPublishedSite } from '@/server/db/queries/sites'
import { type BrandingAsset } from '@/server/db/schema'

/**
 * The contact form's words, in the two languages a brand can be generated in.
 *
 * Not `next-intl`. A published site sits outside the `[locale]` segment and has
 * no translation context — and should not have one: the language belongs to the
 * brand, not to the browser visiting it. A customer in Dubai whose site is in
 * Arabic must not get an English form because the visitor's laptop is set to
 * English.
 */
const CONTACT_LABELS = {
  en: {
    name: 'Your name',
    email: 'Your email',
    message: 'Message',
    send: 'Send message',
    sending: 'Sending…',
    sent: 'Thank you — your message has been sent.',
    failed: 'That did not send. Please try again.',
  },
  ar: {
    name: 'اسمك',
    email: 'بريدك الإلكتروني',
    message: 'الرسالة',
    send: 'أرسل الرسالة',
    sending: 'جارٍ الإرسال…',
    sent: 'شكرًا لك — تم إرسال رسالتك.',
    failed: 'تعذّر الإرسال. حاول مرة أخرى.',
  },
} as const

/** Where a public image is served from — see `/api/site-image`. */
const imageUrl = (id: string) => `/api/site-image/${id}`

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

/*
 * Published customer websites.
 *
 * Deliberately outside the [locale] segment: these are the customer's own
 * sites, not part of the Brandora app, so they carry no app chrome, no locale
 * prefix and no session. The [subdomain] segment holds either a Brandora
 * subdomain or an attached custom domain — see getPublishedSite.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>
}): Promise<Metadata> {
  const { subdomain } = await params
  const site = await getPublishedSite(subdomain)
  if (!site) return { title: 'Not found' }

  const name = site.project.businessName || site.project.title
  const description = site.branding?.slogan ?? undefined

  /*
   * The brand's own favicon and share card, which have existed in storage since
   * the day the logo was chosen and have never been on the site they belong to.
   * Absolute URLs, from the host actually being served — a share card is fetched
   * by Slack or WhatsApp, not by the browser, so a relative path is nothing.
   */
  const host = (await headers()).get('host')
  const origin = host ? `https://${host}` : undefined
  const image = origin && site.images.og ? `${origin}${imageUrl(site.images.og)}` : undefined

  return {
    title: name,
    description,
    robots: { index: true, follow: true },
    icons: site.images.favicon ? { icon: imageUrl(site.images.favicon) } : undefined,
    openGraph: {
      title: name,
      description,
      siteName: name,
      type: 'website',
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: name,
      description,
      images: image ? [image] : undefined,
    },
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

  const site = await getPublishedSite(subdomain)
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
    <div style={{ backgroundColor: theme.safe.paper, minHeight: '100dvh' }}>
        <header
          className="flex flex-wrap items-center justify-between gap-4 px-8 py-5"
          style={{ borderBottom: `1px solid ${theme.safe.line}` }}
        >
          {/* The logo when there is one, the name when there is not — never both,
              and never a name-shaped gap while an image loads. */}
          {site.images.logo ? (
            <img
              src={imageUrl(site.images.logo)}
              alt={name}
              className="w-auto"
              style={{ height: 'clamp(1.75rem, 3vw, 2.5rem)' }}
            />
          ) : (
            <span
              className="text-lg font-bold"
              /* The brand's own colour when it can be read on the brand's own
                 ground, deepened when it cannot — this is the site's name. */
              style={{ fontFamily: `'${theme.fontHeading}', sans-serif`, color: theme.safe.accent }}
            >
              {name}
            </span>
          )}

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
                /* The inactive state is a checked softer ink rather than an
                   opacity multiplier, which cannot reach the contrast floor. */
                style={{
                  fontFamily: `'${theme.fontBody}', sans-serif`,
                  color: key === active ? theme.safe.ink : theme.safe.muted,
                }}
              >
                {key}
              </a>
            ))}
          </nav>
        </header>

        <PageRenderer
          blocks={blocks}
          theme={theme}
          images={site.images}
          contact={CONTACT_LABELS[site.project.language]}
        />

        <footer
          className="px-8 py-10 text-center text-sm"
          style={{
            fontFamily: `'${theme.fontBody}', sans-serif`,
            color: theme.safe.muted,
            borderTop: `1px solid ${theme.safe.line}`,
          }}
        >
          © {new Date().getFullYear()} {name}
      </footer>
    </div>
  )
}
