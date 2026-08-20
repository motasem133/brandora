import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  Bricolage_Grotesque,
  IBM_Plex_Mono,
  IBM_Plex_Sans_Arabic,
  Plus_Jakarta_Sans,
} from 'next/font/google'
import { notFound } from 'next/navigation'

import { PostHogProvider } from '@/components/analytics/posthog-provider'
import { isRtl, routing } from '@/i18n/routing'
import { ogImage, ogLocale, siteUrl } from '@/lib/seo'
import { themeInitScript } from '@/lib/theme'
import '../globals.css'

/*
 * Three Latin roles, not one.
 *
 * One family carried everything here, on the reasoning that two was one more
 * than the brand needs. That holds inside the app and it does not hold on the
 * marketing page, which sells typography as one of the ten things a run
 * produces and was setting the whole argument in a single weight-varied UI
 * sans. A page that cannot show a pairing is a poor advertisement for a product
 * that generates them.
 *
 * The split is by role and the roles do not overlap: display is the only thing
 * that changed, body is untouched, and the mono is a face the page already
 * wanted and did not have.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  /* 800 is gone: `font-extrabold` appears nowhere in the codebase, and it was
     a whole file per locale for a weight nothing sets. */
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
})

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

/*
 * Utility. Hex codes, the run panel's log lines, timings, credit figures.
 *
 * `font-mono` resolved to whatever the visitor's browser called monospace,
 * which on this page meant the palette card's four hex values rendered in a
 * different face per platform. It is also the superfamily sibling of the
 * Arabic face below, so the two non-Jakarta stacks are related by design.
 */
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  /* 300 is gone for the same reason as Jakarta's 800: `font-light` is unused. */
  weight: ['400', '500', '600', '700'],
  /*
   * `--font-arabic-face`, not `--font-arabic`.
   *
   * The theme layer also declares `--font-arabic`, as `var(--font-arabic), …`
   * — which with this name was a cycle. One of the two won by source order and
   * the generic tail was silently dropped. Naming the raw face separately lets
   * the theme token compose it properly, which is what makes it safe to append
   * to the display and mono stacks.
   */
  variable: '--font-arabic-face',
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
      className={`${jakarta.variable} ${bricolage.variable} ${mono.variable} ${arabic.variable}`}
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
