import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { billingHref, cn, type BillingInterval, type Currency } from '@/lib/utils'

const INTERVALS: BillingInterval[] = ['monthly', 'yearly']

/**
 * Monthly / yearly switch.
 *
 * Links rather than client state, for the same reasons as the currency switch:
 * prices stay server-rendered, the URL is shareable with an interval already
 * applied, and the selection survives with JavaScript disabled.
 */
export async function IntervalSwitch({
  active,
  currency,
  href = '/dashboard/billing',
}: {
  active: BillingInterval
  currency: Currency
  href?: string
}) {
  const t = await getTranslations('Billing')

  return (
    <div
      className="inline-flex rounded-lg border border-line p-0.5"
      role="group"
      aria-label={t('interval')}
    >
      {INTERVALS.map((interval) => (
        <Link
          key={interval}
          href={billingHref(href, { currency, interval })}
          scroll={false}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            interval === active ? 'bg-elevated text-fg' : 'text-fg-secondary hover:text-fg',
          )}
        >
          {t(interval)}
        </Link>
      ))}
    </div>
  )
}
