import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { CURRENCIES, type Currency } from '@/lib/utils'

/**
 * Currency switch as links rather than client state.
 *
 * The choice lives in the URL, so prices are server-rendered, the page is
 * shareable with a currency already applied, and no JavaScript is needed.
 */
export async function CurrencySwitch({
  active,
  href = '/dashboard/billing',
}: {
  active: Currency
  href?: string
}) {
  const t = await getTranslations('Billing')

  return (
    <div className="inline-flex rounded-lg border border-line p-0.5" role="group" aria-label={t('currency')}>
      {CURRENCIES.map((currency) => (
        <Link
          key={currency}
          href={`${href}?currency=${currency}`}
          scroll={false}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium uppercase transition-colors',
            currency === active ? 'bg-elevated text-fg' : 'text-fg-secondary hover:text-fg',
          )}
        >
          {currency}
        </Link>
      ))}
    </div>
  )
}
