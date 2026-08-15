import { getTranslations } from 'next-intl/server'

import { Disclosure } from '@/components/ui/disclosure'

/**
 * The questions someone asks before paying, answered once.
 *
 * Shared by the landing page's pricing section and the pricing page, for the
 * same reason the plan ladder is: these were the two surfaces that already
 * disagreed about what a plan includes, and an answer that drifts is worse
 * than no answer, because it is read as a promise.
 *
 * Every answer describes what the application actually does. "SVG on Creator
 * and above" is true because the file route checks the plan; "unused brands do
 * not roll over" is true because a renewal replaces the balance rather than
 * adding to it.
 */
export async function PricingFaq({
  className,
  /**
   * Two columns and a section-sized heading, for the landing page's own FAQ
   * beat. The pricing page keeps the single narrow column: there the questions
   * sit under a plan ladder someone is already reading top to bottom, and a
   * second column would ask them to start again halfway up the page.
   */
  columns = false,
}: {
  className?: string
  columns?: boolean
}) {
  const t = await getTranslations('Pricing')
  const items = t.raw('faq') as { q: string; a: string }[]

  return (
    <div className={className}>
      {columns ? (
        <h2 className="type-section">{t('faqTitle')}</h2>
      ) : (
        <h3 className="font-display text-xl font-semibold">{t('faqTitle')}</h3>
      )}

      {/*
        `Disclosure` is a native <details>, so it is keyboard-operable and
        findable by the browser's own page search even while collapsed.

        Two columns are laid out as two lists rather than with CSS `columns`,
        which would break a `<details>` across a column boundary mid-answer when
        one is opened.
      */}
      <div
        className={
          columns
            ? 'mt-8 grid items-start gap-3 lg:grid-cols-2 lg:gap-x-5'
            : 'mt-5 space-y-3'
        }
      >
        {items.map((item) => (
          <Disclosure key={item.q} title={item.q}>
            <p className="max-w-[70ch] text-sm leading-relaxed text-fg-secondary">{item.a}</p>
          </Disclosure>
        ))}
      </div>
    </div>
  )
}
