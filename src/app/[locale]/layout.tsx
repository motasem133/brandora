import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  Bricolage_Grotesque,
  Familjen_Grotesk,
  Hanken_Grotesk,
  Readex_Pro,
  Spline_Sans_Mono,
} from 'next/font/google'
import { notFound } from 'next/navigation'

import { PostHogProvider } from '@/components/analytics/posthog-provider'
import { isRtl, routing } from '@/i18n/routing'
import { ogImage, ogLocale, siteUrl } from '@/lib/seo'
import { themeInitScript } from '@/lib/theme'
import '../globals.css'


/*
 * Display, marketing only.
 *
 * Variable across `opsz` as well as `wght`, which is the reason it is worth a
 * second file: the same face is drawn correctly at a 74px hero and at a 20px
 * card title, rather than one outline being scaled to both. No weight array —
 * next/font serves the variable axis when the range is left open.
 */
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  /*
   * `opsz` has to be asked for.
   *
   * The whole justification for a second Latin file is that one outline is
   * drawn correctly at a 74px hero and a 20px card title. Measured before this
   * line existed, it was not: the served face advertised `wght` only, and the
   * advance width of a string was identical with `font-optical-sizing: auto`
   * and `none` at both sizes. next/font requests weight alone unless the other
   * axes are named, so the face was being scaled — exactly what the comment
   * above claims it avoids.
   */
  axes: ['opsz'],
  variable: '--font-bricolage',
  display: 'swap',
})



/* -------------------------------------------------------------------------- */
/*                        The board's own faces                                */
/* -------------------------------------------------------------------------- */
/*
 * The product's faces. Bricolage below is the marketing display face and the
 * only survivor of the family the app used before the board.
 *
 * The board is a replacement visual world, and it is being migrated one surface
 * at a time rather than by flipping `:root` — so these four have to exist on the
 * document while most of the app is still on Jakarta and Plex. That costs four
 * font files on every page until the migration finishes, which is the price of
 * not rewriting twenty-three routes in one commit.
 */

/** Display. A grotesque with enough shape to sit above a customer's own mark
    without competing with it. */
const familjen = Familjen_Grotesk({
  subsets: ['latin'],
  variable: '--font-familjen',
  display: 'swap',
})

/** The board's interface face. Warmer and narrower than Jakarta, which is what
    lets a dense table stay quiet at 13px. */
const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
})

/*
 * The machine's voice: credit figures, file dimensions, dates, hex.
 *
 * Distinct from the interface face on purpose — anything the pipeline emitted
 * is set in this, anything we wrote is not, and that is the whole tell. Ships
 * 400 and 500 only; nothing may set a heavier weight on it, because the face
 * has no bold to draw and the browser would synthesise one.
 */
const splineMono = Spline_Sans_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-spline-mono',
  display: 'swap',
})

/*
 * Arabic, for the board.
 *
 * Drawn for Arabic and Latin together rather than being an Arabic sibling of a
 * Latin superfamily, which matters on a surface where the two sit in the same
 * `--font-readex-face`, not `--font-arabic`: the theme layer declares
 * `--font-arabic` as `var(--font-readex-face), …`, and naming both the same
 * would be a cycle — one would win by source order and the generic tail would
 * be dropped silently.
 */
const readex = Readex_Pro({
  subsets: ['arabic', 'latin'],
  /* Weights shipped are weights used, the rule that dropped Jakarta's 800 and
     Plex Arabic's 300 before it: `font-light` appears nowhere in the codebase,
     and on a face served across two subsets an unused weight is two files. */
  weight: ['400', '500', '600'],
  variable: '--font-readex-face',
  display: 'swap',
})

/**
 * The defaults every page under this layout inherits.
 *
 * Per-locale rather than static, for the reason the whole product exists:
 * `/en` and `/ar` are two languages of one site, and a single hard-coded
 * English description was being served on the Arabic page — the one line a
 * crawler reads, in the wrong language, on a product whose durable constraint
 * is that Arabic is not a translation layer.
 *
 * `metadataBase` is what makes every relative URL below absolute. Without it
 * Next emits relative Open Graph image URLs, which no social platform resolves,
 * so a share of this page rendered as a bare link.
 *
 * The signed-in routes inherit this too — they live under the same `[locale]`
 * segment — and that is harmless: `app/robots.ts` keeps them out of the index,
 * and metadata on a page a crawler never fetches costs nothing.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Meta' })
  const common = await getTranslations({ locale, namespace: 'Common' })

  return {
    metadataBase: new URL(siteUrl),
    title: { default: common('appName'), template: `%s · ${common('appName')}` },
    description: t('homeDescription'),
    openGraph: {
      type: 'website',
      siteName: common('appName'),
      locale: ogLocale(locale),
      images: [{ ...ogImage, alt: t('ogAlt') }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [{ url: ogImage.url, alt: t('ogAlt') }],
    },
  }
}

/** Pre-render both locales so the marketing shell can be static. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  setRequestLocale(locale)
  const t = await getTranslations('Common')

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? 'rtl' : 'ltr'}
      suppressHydrationWarning
      className={`${familjen.variable} ${hanken.variable} ${splineMono.variable} ${readex.variable} ${bricolage.variable}`}
    >
      <head>
        {/*
          Rendered by a Server Component so it ships in the initial HTML and runs
          before first paint. A <script> created inside a client component would
          never execute, which is what React 19 warns about.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <NextIntlClientProvider>
          <PostHogProvider />
          {/*
            Vercel's own counting, beside PostHog rather than instead of it.
            They answer different questions: PostHog follows a person through a
            funnel, this reports traffic against the routes as deployed, and it
            is the only one that sees a visit the product code never ran for.

            No proxy needed, unlike PostHog above: the script is served from
            this origin under /_vercel, so an ad blocker has nothing to match.
          */}
          <Analytics />
          {/*
            The first thing in the tab order, hidden until it takes focus.
            Every signed-in route puts ten chrome stops — a wordmark, a collapse
            toggle, four nav rows, and four header controls — ahead of its
            content, and a keyboard user paid that toll on every navigation.
          */}
          <a
            href="#content"
            className="sr-only rounded-control bg-surface px-4 py-2.5 text-sm font-medium text-fg shadow-[var(--shadow-lifted)] focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50"
          >
            {t('skipToContent')}
          </a>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
