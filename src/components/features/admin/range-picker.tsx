import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import type { Range } from '@/server/db/queries/admin'

const RANGES: Range[] = [7, 30, 90]

/** Range as a link, so the view is server-rendered and shareable. */
export async function RangePicker({ active }: { active: Range }) {
  const t = await getTranslations('Admin')

  return (
    <div className="inline-flex rounded-lg border border-line p-0.5">
      {RANGES.map((range) => (
        <Link
          key={range}
          href={`/admin/ai?range=${range}`}
          scroll={false}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            range === active ? 'bg-elevated text-fg' : 'text-fg-secondary hover:text-fg',
          )}
        >
          {t('ai.days', { days: range })}
        </Link>
      ))}
    </div>
  )
}
