import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

import { PageRenderer, registerStyle, resolveTheme } from '@/components/blocks/block-renderer'
import { SiteFooter, SiteHeader, TITLES } from '@/components/blocks/site-chrome'
import { PAGE_KEYS, type Block, type PageKey, type Theme } from '@/lib/blocks'
import { asRegister, registerFor } from '@/lib/register'
import { absoluteUrl, basePath } from '@/lib/site-url'
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
 * The page a path asks for, defaulting to home; anything deeper is not a page.
 *
 * The segment is `[[...path]]` and not `[[...page]]`, which it was until a
 * production build proved that a search param may not share a name with the
 * dynamic segment it sits under: `?page=about` arrived as nothing, the page
 * fell back to home, and every `?page=` link ever shared quietly stopped
 * working. `next dev` redirected correctly, which is why this reached
 * production before it was seen.
 *
 * Checked against the pages this site actually has rather than against the
 * vocabulary: a consultancy has no menu, and `/menu` on its site is a 404, not
 * an empty page with a heading and nothing under it.
 */
function pageKey(segments: string[] | undefined, pages: Record<string, unknown>): PageKey {
  const [first, ...rest] = segments ?? []
  if (rest.length) notFound()
  if (!first) return 'home'
  if (!PAGE_KEYS.includes(first as PageKey) || !pages[first]) notFound()
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
  params: Promise<{ subdomain: string; path?: string[] }>
}): Promise<Metadata> {
  const { subdomain, path } = await params
  const site = await getPublishedSite(subdomain)
  if (!site) return { title: 'Not found' }

  const active = pageKey(path, (site.website.pages ?? {}) as Record<string, unknown>)
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
  const canonical = absoluteUrl(host, subdomain, active)

  return {
    title,
    description,
    robots: { index: true, follow: true },
    icons: site.images.favicon ? { icon: imageUrl(site.images.favicon) } : undefined,
    /* The path form is the address, so the `?page=` links people have already
       shared do not compete with it for the same page. */
    alternates: { canonical },
    openGraph: {
      title,
      description,
      siteName: name,
      type: 'website',
      url: canonical,
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
  params: Promise<{ subdomain: string; path?: string[] }>
  searchParams: Promise<{ page?: string; register?: string }>
}) {
  const { subdomain, path } = await params
  /* `register` is honoured outside production only: it is how the preview
     harness puts four registers side by side without four brands. */
  const { page: queryPage, register: forcedRegister } = await searchParams

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

  const active = pageKey(path, pages)
  const blocks = pages[active] ?? []

  /*
   * The brand's bearing, from what it already told us at the wizard.
   *
   * Two sites for two different businesses were the same site with two palettes
   * — same rhythm, same scale, same corners, same everything a person reads
   * before they read a word. This is the same judgement the kit makes, from the
   * same two fields, so a customer's site and their posts agree with each other.
   */
  const register =
    (process.env.NODE_ENV !== 'production' ? asRegister(forcedRegister) : undefined) ??
    registerFor(site.project.brandStyle, site.project.industry)
  const nav = PAGE_KEYS.filter((key) => pages[key]?.length)

  const name = site.project.businessName || site.project.title

  // Fonts are linked from the layout's <head>, where React can resolve their
  // precedence without being told.
  return (
    <div style={{ ...registerStyle(register), backgroundColor: theme.safe.paper, minHeight: '100dvh' }}>
        <SiteHeader
          name={name}
          logoUrl={site.images.logo ? imageUrl(site.images.logo) : undefined}
          nav={nav}
          active={active}
          theme={theme}
          register={register}
          base={base}
          language={site.project.language}
        />

        <PageRenderer
          blocks={blocks}
          theme={theme}
          images={site.images}
          register={register}
          base={base}
          contact={CONTACT_LABELS[site.project.language]}
        />

        <SiteFooter name={name} theme={theme} year={new Date().getFullYear()} />
    </div>
  )
}
