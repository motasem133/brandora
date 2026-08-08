import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PlanEditor } from '@/components/features/admin/plan-editor'
import { formatPrice } from '@/lib/utils'
import { getAllPlans } from '@/server/db/queries/plans'

export default async function AdminPlansPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Admin')
  const all = await getAllPlans()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('plans.title')}</h1>
        <p className="mt-1 text-sm text-fg-secondary">{t('plans.subtitle')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {all.map((plan) => (
          <PlanEditor
            key={plan.id}
            plan={{
              id: plan.id,
              name: plan.name,
              price: formatPrice(plan.priceMonthly, 'usd', locale),
              monthlyCredits: plan.monthlyCredits,
              isActive: plan.isActive,
              websiteBuilder: plan.websiteBuilder,
              socialMediaKit: plan.socialMediaKit,
              vectorExport: plan.vectorExport,
              brandAssistant: plan.brandAssistant,
              customDomain: plan.customDomain,
              polarProductIdMonthly: plan.polarProductIdMonthly,
            }}
          />
        ))}
      </div>
    </div>
  )
}
