import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

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

/**
 * What this site's own links have to look like from where the visitor is
 * standing.
 *
 * A published site has two real addresses and they need different hrefs. On the
 * customer's own host — `theircompany.com` or `acme.brandora.enigmitic.com` —
 * the proxy rewrites `/about` onto `/sites/{host}/about`, so the page a visitor
 * asked for is `/about` and a link to `/sites/acme/about` would be rewritten a
 * second time and 404. Reached inside the app at `/sites/acme`, the same link
 * has to carry that prefix.
 *
 * The host is what knows which world this is: a rewritten request always
 * arrives with the site's own hostname, so the segment matches either the whole
 * hostname (a custom domain) or its first label (a subdomain).
 */
function basePath(host: string | null, segment: string) {
  const hostname = (host ?? '').split(':')[0]
  const rewritten = hostname === segment || hostname.split('.')[0] === segment
  return rewritten ? '' : `/sites/${segment}`
}

/**
 * What each page is called, in the two languages a brand can be generated in.
 *
 * The nav printed the page keys — `home`, `about` — capitalised by CSS, which
 * is English structure showing through on an Arabic site. Same argument as the
 * contact form's labels above: the language belongs to the brand.
 */
const TITLES = {
  en: { home: 'Home', about: 'About', services: 'Services', contact: 'Contact' },
  ar: { home: 'الرئيسية', about: 'من نحن', services: 'خدماتنا', contact: 'اتصل بنا' },
} as const satisfies Record<string, Record<PageKey, string>>

/** The page a path asks for, defaulting to home; anything deeper is not a page. */
function pageKey(segments: string[] | undefined): PageKey {
  const [first, ...rest] = segments ?? []
  if (rest.length) notFound()
  if (!first) return 'home'
  if (!PAGE_KEYS.includes(first as PageKey)) notFound()
  return first as PageKey
}

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
  params: Promise<{ subdomain: string; page?: string[] }>
}): Promise<Metadata> {
  const { subdomain, page } = await params
  const site = await getPublishedSite(subdomain)
  if (!site) return { title: 'Not found' }

  const active = pageKey(page)
  const name = site.project.businessName || site.project.title
  const description = site.branding?.slogan ?? undefined

  /* Four pages shared one title for as long as they shared one URL. */
  const title = active === 'home' ? name : `${TITLES[site.project.language][active]} — ${name}`

  /*
   * The brand's own favicon and share card, which have existed in storage since
   * the day the logo was chosen and have never been on the site they belong to.
   * Absolute URLs, from the host actually being served — a share card is fetched
   * by Slack or WhatsApp, not by the browser, so a relative path is nothing.
   */
  const host = (await headers()).get('host')
  const origin = host ? `https://${host}` : undefined
  const image = origin && site.images.og ? `${origin}${imageUrl(site.images.og)}` : undefined
  const base = basePath(host, subdomain)
  const path = active === 'home' ? `${base}/` : `${base}/${active}`

  return {
    title,
    description,
    robots: { index: true, follow: true },
    icons: site.images.favicon ? { icon: imageUrl(site.images.favicon) } : undefined,
    /* The path form is the address, so the `?page=` links people have already
       shared do not compete with it for the same page. */
    alternates: { canonical: origin ? `${origin}${path}` : path },
    openGraph: {
      title,
      description,
      siteName: name,
      type: 'website',
      url: origin ? `${origin}${path}` : undefined,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function PublishedSite({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string; page?: string[] }>
  searchParams: Promise<{ page?: string }>
}) {
  const { subdomain, page } = await params
  const { page: queryPage } = await searchParams

  const host = (await headers()).get('host')
  const base = basePath(host, subdomain)

  /*
   * `?page=about` was how this site navigated for its whole life, so those
   * links exist — in people's messages, in a customer's own printed material,
   * in whatever a search engine indexed. They keep working by becoming the
   * address they should always have had.
   */
  if (queryPage && PAGE_KEYS.includes(queryPage as PageKey)) {
    redirect(queryPage === 'home' ? `${base}/` : `${base}/${queryPage}`)
  }

  const active = pageKey(page)

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

          <nav aria-label={TITLES[site.project.language].home} className="flex gap-5">
            {nav.map((key) => (
              <a
                key={key}
                href={key === 'home' ? `${base}/` : `${base}/${key}`}
                aria-current={key === active ? 'page' : undefined}
                className="text-sm hover:underline"
                /* The inactive state is a checked softer ink rather than an
                   opacity multiplier, which cannot reach the contrast floor. */
                style={{
                  fontFamily: `'${theme.fontBody}', sans-serif`,
                  color: key === active ? theme.safe.ink : theme.safe.muted,
                }}
              >
                {TITLES[site.project.language][key]}
              </a>
            ))}
          </nav>
        </header>

        <PageRenderer
          blocks={blocks}
          theme={theme}
          images={site.images}
          base={base}
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
