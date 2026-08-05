import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IBM_Plex_Sans_Arabic, Plus_Jakarta_Sans } from 'next/font/google'
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
      className={`${jakarta.variable} ${arabic.variable}`}
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
