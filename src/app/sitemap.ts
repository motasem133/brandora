import type { MetadataRoute } from 'next'

import { locales } from '@/i18n/routing'
import { alternatesFor, canonicalUrl, marketingPaths } from '@/lib/seo'

/**
 * Brandora's own sitemap, for Brandora's own domain.
 *
 * Like robots.txt, `/sitemap.xml` is in the proxy matcher so a customer's
 * domain gets *their* sitemap; this is what the apex serves, and it did not
 * exist before.
 *
 * Every marketing page appears once per language, and each entry carries the
 * full set of `alternates.languages`. That repetition is the format working as
 * intended — hreflang is reciprocal, and a search engine that finds `/ar`
 * through the sitemap has to be told from that entry that `/en` is the same
 * page, not follow a link to find out.
 *
 * No `lastModified`. A date that is generated at build time is the build's
 * date, not the page's, and a sitemap that claims every page changed on every
 * deploy teaches a crawler to stop believing the field. Priorities are left off
 * for the same reason: four pages do not need ranking against each other.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) =>
    marketingPaths.map((path) => ({
      url: canonicalUrl(locale, path),
      alternates: { languages: alternatesFor(locale, path).languages },
      changeFrequency: 'monthly' as const,
    })),
  )
}
