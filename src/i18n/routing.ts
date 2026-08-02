import { defineRouting } from 'next-intl/routing'

export const locales = ['en', 'ar'] as const
export type Locale = (typeof locales)[number]

/** Locales that render right-to-left. Drives `dir` on <html>. */
export const rtlLocales: Locale[] = ['ar']

export function isRtl(locale: string): boolean {
  return rtlLocales.includes(locale as Locale)
}

export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  // Always prefix so both languages are independently crawlable.
  localePrefix: 'always',
  localeDetection: true,
})
