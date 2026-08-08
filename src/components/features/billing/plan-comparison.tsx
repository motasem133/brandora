import { Check, Minus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { brandsFrom } from '@/server/billing/credits'
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
      title: t('groupVolume'),
      rows: [
        {
          label: t('rowBrands'),
          value: (p) =>
            p.priceMonthly === 0
              ? t('rowBrandsOnce', { brands: brands(p) })
              : t('rowBrandsMonth', { brands: brands(p) }),
        },
        { label: t('rowCredits'), value: (p) => String(p.monthlyCredits) },
        {
          label: t('rowProjects'),
          value: (p) => (p.maxProjects < 0 ? t('unlimited') : String(p.maxProjects)),
        },
      ],
    },
    {
      title: t('groupIdentity'),
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
      title: t('groupWebsite'),
      rows: [
        { label: t('rowBuilder'), value: (p) => p.websiteBuilder },
        { label: t('rowPublish'), value: (p) => p.websiteBuilder },
        { label: t('rowDomain'), value: (p) => p.customDomain },
      ],
    },
    {
      title: t('groupSocial'),
      rows: [
        { label: t('rowCaptions'), value: () => true },
        { label: t('rowKit'), value: (p) => p.socialMediaKit },
        { label: t('rowBookPdf'), value: (p) => p.socialMediaKit },
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
      title: t('groupTools'),
      rows: [{ label: t('rowAssistant'), value: (p) => p.brandAssistant }],
    },
    {
      title: t('groupTeam'),
      rows: [
        { label: t('rowSeats'), value: (p) => (p.seats < 0 ? t('unlimited') : String(p.seats)) },
      ],
    },
  ]

  return (
    /*
     * Wide content scrolls inside its own box, so the page body never does.
     *
     * The box used to be a rounded panel with a border all the way round, which
     * is a card, and a card is the one shape this publication does not use. A
     * printed table is held by its rules: one under the head, one under each
     * row, and nothing down the sides.
     */
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">{t('compareTitle')}</caption>
        <thead>
          <tr className="border-b border-line-strong">
            {/* Blank in print. The column of row labels is named by the plate
                it sits under, and repeating that title inside the table was the
                same words twice within an inch of each other. */}
            <th scope="col" className="w-2/5 pb-3 pe-5 text-start">
              <span className="sr-only">{t('compareTitle')}</span>
            </th>
            {rows.map((plan) => (
              <th key={plan.id} scope="col" className="type-runhead pb-3 text-center">
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>

        {groups.map((group) => (
          <tbody key={group.title}>
            <tr>
              {/* The group name sits on the rule rather than in a tinted band.
                  A band is a shaded div; a rule with a word on it is how a
                  printed table separates its sections. */}
              <th
                colSpan={rows.length + 1}
                className="type-runhead border-t border-line-strong pb-2 pt-7 text-start"
              >
                {group.title}
              </th>
            </tr>
            {group.rows.map((row) => (
              <tr key={row.label} className="border-t border-line">
                <td className="py-3 pe-5 text-fg-secondary">{row.label}</td>
                {rows.map((plan) => {
                  const value = row.value(plan)
                  return (
                    <td key={plan.id} className="py-3 text-center tabular-nums">
                      {typeof value === 'string' ? (
                        <span>{value}</span>
                      ) : value ? (
                        <>
                          {/* A printed table marks inclusion with a mark, not
                              with a coloured icon. The dash for its absence is
                              an en rule, which is what a table cell with nothing
                              in it carries on paper. */}
                          <Check className="mx-auto size-4" aria-hidden />
                          <span className="sr-only">{t('included')}</span>
                        </>
                      ) : (
                        <>
                          <Minus className="mx-auto size-4 text-fg-muted" aria-hidden />
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
