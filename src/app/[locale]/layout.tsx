import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Amiri, Fraunces, IBM_Plex_Sans_Arabic, Plus_Jakarta_Sans } from 'next/font/google'
import { notFound } from 'next/navigation'

import { PostHogProvider } from '@/components/analytics/posthog-provider'
import { isRtl, routing } from '@/i18n/routing'
import { themeInitScript } from '@/lib/theme'
import '../globals.css'

/*
 * One family across the whole product, weight doing the work display type used
 * to do. Two families was one more than the brand needs, and the pairing put a
 * geometric display face next to a neutral text face for no reason anyone
 * could point at.
 *
 * That held while everything was chrome. The marketing world is a printed brand
 * book now, and a book has a title face, the thing weight alone was standing in
 * for. Jakarta stays, and stays the only face behind the login.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
})

/*
 * The title face, and the whole reason the page stops reading as a template.
 *
 * Plus Jakarta Sans was set at every size including `--font-display`, and a
 * geometric sans at 4.6rem is the single most recognisable signal of an AI
 * product's landing page, it is the same face, at the same size, on the same
 * dark ground, as several hundred of them. No amount of recolouring below it
 * changes what the first line of the page is set in.
 *
 * Fraunces rather than a neutral book serif. It carries an optical-size axis, so
 * the same family is correct at a plate title and at a running head instead of
 * one drawing being scaled to both, and SOFT and WONK give it a face somebody
 * remembers. A brand book is allowed to have a voice; that is what it is selling.
 */
const display = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-display-latin',
  display: 'swap',
})

/*
 * Arabic's title face, and not a transliteration of the Latin decision.
 *
 * IBM Plex Sans Arabic is a good text face and stays as one. It is not a book
 * face, and setting an Arabic plate title in a sans while the Latin one is a
 * serif would say the Arabic page is the translated afterthought, on a product
 * whose proof is that it generates Arabic natively.
 *
 * Amiri is the naskh built for exactly this: it is a book face, its Latin is
 * derived from Crimson so the two scripts are relatives rather than strangers,
 * and it sits in the same register as Reem Kufi Ink, which is what one of the
 * brands on this page is actually set in.
 */
const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-display-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'Brandora', template: '%s · Brandora' },
  description: 'Your entire brand identity, generated in 60 seconds.',
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
      className={`${jakarta.variable} ${arabic.variable} ${display.variable} ${amiri.variable}`}
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
