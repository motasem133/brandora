import { getTranslations } from 'next-intl/server'

import { SegmentedControl, SegmentedLink } from '@/components/ui/segmented-control'
import { billingHref } from '@/lib/utils'
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
    <SegmentedControl label={t('currency')}>
      {CURRENCIES.map((currency) => (
        <SegmentedLink
          key={currency}
          href={billingHref(href, { currency })}
          active={currency === active}
          className="uppercase"
        >
          {currency}
        </SegmentedLink>
      ))}
    </SegmentedControl>
  )
}
