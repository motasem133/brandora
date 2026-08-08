import { Check, Minus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { brandsFrom, contentPiecesFrom } from '@/server/billing/credits'
import type { plans } from '@/server/db/schema'

/**
 * What each plan includes, built from the columns the application checks.
 *
 * Every row here corresponds to a gate that exists in the code: a boolean the
 * server reads before it does the thing. A comparison table is the most
 * load-bearing copy on a pricing page — it is read as a contract — so it is
 * derived rather than written, and a feature cannot appear in it without
 * something enforcing it.
 *
 * Two columns the plans table carries are deliberately absent. `priorityQueue`
 * is a flag nothing reads, so selling it would be selling nothing; and there
 * are no columns at all for white-label, an API or analytics, because none of
 * those are built.
 */
type Plan = typeof plans.$inferSelect

/** A group of rows, in the order someone evaluates a brand tool. */
type Group = {
  title: string
  rows: {
    label: string
    /** A tick, a dash, or a value — whatever the plan actually grants. */
    value: (plan: Plan) => boolean | string
  }[]
}

const brands = (plan: Plan) => brandsFrom(plan.monthlyCredits, plan)

export async function PlanComparison({ plans: rows }: { plans: Plan[] }) {
  const t = await getTranslations('Pricing')

  const groups: Group[] = [
    {
      title: t('groupUsage'),
      rows: [
        // Credits first: they are what the plan grants. The two rows under it
        // are the same number spent two different ways.
        { label: t('rowCredits'), value: (p) => String(p.monthlyCredits) },
        {
          label: t('rowBrands'),
          value: (p) =>
            p.priceMonthly === 0
              ? t('rowBrandsOnce', { brands: brands(p) })
              : t('rowBrandsMonth', { brands: brands(p) }),
        },
        { label: t('rowContent'), value: (p) => String(contentPiecesFrom(p.monthlyCredits)) },
        {
          label: t('rowProjects'),
          value: (p) => (p.maxProjects < 0 ? t('unlimited') : String(p.maxProjects)),
        },
      ],
    },
    {
      title: t('groupBranding'),
      rows: [
        // Every plan generates these; the table says so rather than leaving a
        // visitor to assume the free one is crippled.
        { label: t('rowNames'), value: () => true },
        { label: t('rowLogos'), value: () => true },
        { label: t('rowPalette'), value: () => true },
        { label: t('rowStory'), value: () => true },
      ],
    },
    {
      title: t('groupContent'),
      rows: [
        { label: t('rowCaptions'), value: () => true },
        { label: t('rowStudio'), value: () => true },
        { label: t('rowKit'), value: (p) => p.socialMediaKit },
        { label: t('rowBookPdf'), value: (p) => p.socialMediaKit },
      ],
    },
    {
      title: t('groupWebsite'),
      rows: [
        { label: t('rowBuilder'), value: (p) => p.websiteBuilder },
        { label: t('rowPublish'), value: (p) => p.websiteBuilder },
        {
          /*
           * A number, not a tick — the plans differ by how many, and "yes" on
           * both Creator and Studio would hide the difference the customer is
           * choosing between. `false` for none, so the row draws the same dash
           * every other absent capability draws rather than the string "0".
           */
          label: t('rowDomain'),
          value: (p) =>
            p.maxCustomDomains === 0
              ? false
              : p.maxCustomDomains < 0
                ? t('unlimited')
                : String(p.maxCustomDomains),
        },
      ],
    },
    {
      title: t('groupExports'),
      rows: [
        { label: t('rowPng'), value: () => true },
        { label: t('rowSvg'), value: (p) => p.vectorExport },
        { label: t('rowZip'), value: (p) => p.websiteBuilder || p.socialMediaKit },
      ],
    },
    {
      title: t('groupCollaboration'),
      rows: [
        { label: t('rowSeats'), value: (p) => (p.seats < 0 ? t('unlimited') : String(p.seats)) },
        { label: t('rowInvite'), value: (p) => p.seats > 1 },
      ],
    },
    {
      /*
       * One row, and that is the honest size of it. Everything a group called
       * "Advanced" would normally carry — priority generation, white-label, an
       * API, analytics — is unbuilt, and `priorityQueue` is a column nothing
       * reads. A short group beats a padded one.
       */
      title: t('groupAdvanced'),
      rows: [{ label: t('rowAssistant'), value: (p) => p.brandAssistant }],
    },
  ]

  return (
    // Wide content scrolls inside its own box, so the page body never does.
    <div className="overflow-x-auto rounded-panel border border-line">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-2/5 px-5 py-4 text-start text-xs font-medium uppercase tracking-[0.12em] text-fg-muted">
              {t('compareTitle')}
            </th>
            {rows.map((plan) => (
              <th key={plan.id} className="px-4 py-4 text-center font-display font-semibold">
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>

        {groups.map((group) => (
          <tbody key={group.title}>
            <tr>
              <th
                colSpan={rows.length + 1}
                className="border-t border-line bg-elevated/40 px-5 py-2.5 text-start text-xs font-medium uppercase tracking-[0.12em] text-fg-secondary"
              >
                {group.title}
              </th>
            </tr>
            {group.rows.map((row) => (
              <tr key={row.label} className="border-t border-line">
                <td className="px-5 py-3 text-fg-secondary">{row.label}</td>
                {rows.map((plan) => {
                  const value = row.value(plan)
                  return (
                    <td key={plan.id} className="px-4 py-3 text-center tabular-nums">
                      {typeof value === 'string' ? (
                        <span>{value}</span>
                      ) : value ? (
                        <>
                          <Check className="mx-auto size-4 accent-text" aria-hidden />
                          <span className="sr-only">{t('included')}</span>
                        </>
                      ) : (
                        <>
                          <Minus className="mx-auto size-4 text-fg-muted/50" aria-hidden />
                          <span className="sr-only">{t('notIncluded')}</span>
                        </>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}
