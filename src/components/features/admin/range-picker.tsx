import { getTranslations } from 'next-intl/server'

import { SegmentedControl, SegmentedLink } from '@/components/ui/segmented-control'
import type { Range } from '@/server/db/queries/admin'

const RANGES: Range[] = [7, 30, 90]

/** Range as a link, so the view is server-rendered and shareable. */
export async function RangePicker({ active }: { active: Range }) {
  const t = await getTranslations('Admin')

  return (
    <SegmentedControl label={t('ai.range')}>
      {RANGES.map((range) => (
        <SegmentedLink
          key={range}
          href={`/admin/ai?range=${range}`}
          active={range === active}
        >
          {t('ai.days', { days: range })}
        </SegmentedLink>
      ))}
    </SegmentedControl>
  )
}
