import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PackEditor } from '@/components/features/admin/pack-editor'
import { PlanEditor } from '@/components/features/admin/plan-editor'
import { formatPrice } from '@/lib/utils'
import { db } from '@/server/db'
import { creditPacks, plans } from '@/server/db/schema'

export default async function AdminPlansPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Admin')
  const [all, packs] = await Promise.all([
    db.select().from(plans).orderBy(plans.sortOrder),
    db.select().from(creditPacks).orderBy(creditPacks.sortOrder),
  ])

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

      {/* Packs live here rather than on a route of their own: the only thing
          settable on them is the Polar id, which is the same job as above. */}
      <div>
        <h2 className="font-display text-lg font-semibold">Credit packs</h2>
        <p className="mt-1 text-sm text-fg-secondary">
          A pack with no product behind it is not offered for sale.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {packs.map((pack) => (
          <PackEditor
            key={pack.id}
            pack={{
              id: pack.id,
              slug: pack.slug,
              name: pack.name,
              credits: pack.credits,
              price: formatPrice(pack.price, 'usd', locale),
              isActive: pack.isActive,
              polarProductId: pack.polarProductId,
            }}
          />
        ))}
      </div>
    </div>
  )
}
