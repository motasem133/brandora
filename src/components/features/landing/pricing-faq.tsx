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
export async function PricingFaq({ className }: { className?: string }) {
  const t = await getTranslations('Pricing')
  const items = t.raw('faq') as { q: string; a: string }[]

  return (
    <div className={className}>
      <h3 className="font-display text-xl font-semibold">{t('faqTitle')}</h3>

      {/*
        A column rather than two, because these are read in order by someone
        deciding — not scanned. `Disclosure` is a native <details>, so it is
        keyboard-operable and findable by the browser's own page search even
        while collapsed.
      */}
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <Disclosure key={item.q} title={item.q}>
            <p className="max-w-[70ch] text-sm leading-relaxed text-fg-secondary">{item.a}</p>
          </Disclosure>
        ))}
      </div>
    </div>
  )
}
