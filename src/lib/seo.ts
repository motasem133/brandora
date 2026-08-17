import { env } from '@/lib/env'
import { locales, routing, type Locale } from '@/i18n/routing'

/**
 * What search engines are told about the marketing site.
 *
 * Only `/`, `/pricing`, `/privacy` and `/terms` are in scope. Everything else
 * under `[locale]` is signed-in surface — the dashboard, the admin screens, the
 * auth pages — and is kept out of the index by `app/robots.ts` rather than by a
 * per-page tag, because there are far more of those routes than there are
 * marketing ones and a rule that has to be remembered on every new page is a
 * rule that will be forgotten on one.
 *
 * Customer sites are a separate system with its own metadata, sitemap and
 * robots under `app/sites/[subdomain]`. Nothing here applies to them.
 */

/** No trailing slash, so paths can be appended without doubling it. */
export const siteUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')

/**
 * The marketing paths, without a locale prefix.
 *
 * The empty string is the landing page. Kept as one list so the sitemap and the
 * alternates cannot drift apart: a page added here is announced in both places
 * or in neither.
 */
export const marketingPaths = ['', '/pricing', '/privacy', '/terms'] as const

export type MarketingPath = (typeof marketingPaths)[number]

/** The absolute URL of a marketing page in one language. */
export function canonicalUrl(locale: string, path: string): string {
  return `${siteUrl}/${locale}${path}`
}

/**
 * Canonical plus every translation of the same page.
 *
 * `localePrefix` is `always`, so `/en` and `/ar` are two real URLs holding the
 * same page in two languages — exactly what `hreflang` exists to describe. With
 * nothing saying so, the two are free to be read as duplicates and one of them
 * dropped, which on a product that generates Arabic natively would be the wrong
 * one to lose.
 *
 * `x-default` points at English because that is `defaultLocale`, and because
 * the bare `/` redirects there for a visitor with no preference.
 */
export function alternatesFor(locale: string, path: string) {
  const languages: Record<string, string> = {}
  for (const l of locales) languages[l] = canonicalUrl(l, path)
  languages['x-default'] = canonicalUrl(routing.defaultLocale, path)

  return { canonical: canonicalUrl(locale, path), languages }
}

/** The share card. One brand image for both languages — see `scripts/og-card.ts`. */
export const ogImage = {
  url: `${siteUrl}/og.png`,
  width: 1200,
  height: 630,
} as const

/** Open Graph's own name for a locale, which is not the same string as ours. */
export function ogLocale(locale: string): string {
  return locale === 'ar' ? 'ar_AE' : 'en_US'
}

/**
 * A page's complete Open Graph and Twitter blocks.
 *
 * Complete, and that is the whole reason this exists. Next merges metadata
 * *shallowly*: a page that declares `openGraph` to set its own title replaces
 * the layout's entire `openGraph` object, taking the image, the site name and
 * the locale with it. The first version of this work did exactly that, and the
 * pages came back with `og:title` and no `og:image` at all — while the card sat
 * in `public/` being served to nobody. `twitter.card` failed the same way,
 * silently downgrading from `summary_large_image` to `summary`.
 *
 * So every page builds the whole thing from here rather than inheriting half of
 * it. The layout keeps its own copy for the routes that never override it.
 */
export function socialMeta({
  locale,
  path,
  title,
  description,
  siteName,
  imageAlt,
}: {
  locale: string
  path: string
  title: string
  description: string
  siteName: string
  imageAlt: string
}) {
  return {
    openGraph: {
      type: 'website' as const,
      siteName,
      locale: ogLocale(locale),
      url: canonicalUrl(locale, path),
      title,
      description,
      images: [{ ...ogImage, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [{ url: ogImage.url, alt: imageAlt }],
    },
  }
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}
