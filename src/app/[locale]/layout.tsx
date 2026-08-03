import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { IBM_Plex_Sans_Arabic, Inter, Syne } from 'next/font/google'
import { notFound } from 'next/navigation'

import { PostHogProvider } from '@/components/analytics/posthog-provider'
import { isRtl, routing } from '@/i18n/routing'
import { themeInitScript } from '@/lib/theme'
import '../globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const syne = Syne({ subsets: ['latin'], variable: '--font-syne', display: 'swap' })
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

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? 'rtl' : 'ltr'}
      suppressHydrationWarning
      className={`${inter.variable} ${syne.variable} ${arabic.variable}`}
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
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
