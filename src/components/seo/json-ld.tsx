import { siteUrl } from '@/lib/seo'

/**
 * Structured data for the marketing pages.
 *
 * What is *not* here is the point. Schema.org offers `aggregateRating`,
 * `review` and `interactionStatistic`, and every one of them would be inventing
 * a number: PRODUCT.md's rule is no customers, no testimonials, no usage
 * figures, and a rich result is exactly the place that rule gets quietly broken
 * because the markup is invisible on the page. Everything below is a fact
 * already stated in the interface.
 *
 * Rendered as a plain `<script type="application/ld+json">`. The content is
 * built here rather than passed in as a string, so nothing user-supplied ever
 * reaches it — the only escaping hazard is `<` inside the JSON, handled below.
 */

/** `</script>` inside a JSON string ends the block early. Nothing else can. */
function serialise(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

function Script({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialise(data) }}
    />
  )
}

/**
 * Who publishes this site, and what the software is.
 *
 * `Organization` and `WebSite` are the two a search engine uses to attach a
 * name and a logo to the domain. `SoftwareApplication` is what makes the
 * product legible as a product rather than as a blog.
 */
export function SiteJsonLd({
  locale,
  name,
  description,
  category,
}: {
  locale: string
  name: string
  description: string
  category: string
}) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': `${siteUrl}/#organization`,
            name,
            url: siteUrl,
            logo: `${siteUrl}/icon.png`,
          },
          {
            '@type': 'WebSite',
            '@id': `${siteUrl}/#website`,
            name,
            url: siteUrl,
            inLanguage: locale,
            publisher: { '@id': `${siteUrl}/#organization` },
          },
          {
            '@type': 'SoftwareApplication',
            name,
            applicationCategory: category,
            operatingSystem: 'Web',
            description,
            url: `${siteUrl}/${locale}`,
            inLanguage: locale,
            publisher: { '@id': `${siteUrl}/#organization` },
          },
        ],
      }}
    />
  )
}

export type OfferInput = {
  name: string
  price: number
  currency: string
}

/**
 * The plans, as offers.
 *
 * Fed from the same rows the page renders, not from a second list — a price
 * that is true on the page and stale in the markup is worse than no markup,
 * because only one of the two is visible to whoever would catch it.
 */
export function PlanOffersJsonLd({
  locale,
  name,
  description,
  offers,
}: {
  locale: string
  name: string
  description: string
  offers: OfferInput[]
}) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name,
        description,
        brand: { '@id': `${siteUrl}/#organization` },
        url: `${siteUrl}/${locale}/pricing`,
        offers: offers.map((offer) => ({
          '@type': 'Offer',
          name: offer.name,
          price: (offer.price / 100).toFixed(2),
          priceCurrency: offer.currency.toUpperCase(),
          availability: 'https://schema.org/InStock',
          url: `${siteUrl}/${locale}/pricing`,
        })),
      }}
    />
  )
}
