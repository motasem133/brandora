import { getTranslations, setRequestLocale } from 'next-intl/server'

import { BrandPicker } from '@/components/features/studio/brand-picker'
import { ContentComposer } from '@/components/features/studio/content-composer'
import { ContentLibrary } from '@/components/features/studio/content-library'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Link } from '@/i18n/navigation'
import { BUILT_CONTENT_TYPES, type BuiltContentType } from '@/lib/content'
import { CONTENT_VARIANT_COST, creditsForContent } from '@/server/billing/credits'
import { listStudioBrands } from '@/server/db/queries/content'
import { requireOrg } from '@/server/session'

/*
 * A generation runs inside the request. The model chain can fall through three
 * providers before it gives up, and the service caps that at 60 seconds — this
 * has to outlast it, or the platform kills the request while the credit hold is
 * still open and only the sweeper puts it back.
 */
export const maxDuration = 90

/**
 * Content Studio.
 *
 * The brand generator makes a brand once. This is the part a customer comes
 * back to: the same brand, still known, writing the next thing.
 *
 * Which brand lives in `?brand=`, resolved on the server. Everything else in
 * this app puts that kind of choice in the URL, and there is no persisted
 * "current brand" anywhere — deliberately, since Better Auth owns the session
 * table and a second notion of "current" is a thing to keep in sync.
 */
export default async function StudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ brand?: string }>
}) {
  const { locale } = await params
  const { brand: requested } = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations('Studio')
  const { org } = await requireOrg()
  const brands = await listStudioBrands(org.id)

  /*
   * No brand to write from. This must render rather than 404: the link is in
   * the app bar on every page, so a new account reaches it before it has
   * generated anything.
   */
  if (brands.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <Header title={t('title')} subtitle={t('subtitle')} />
        <div className="rounded-panel border border-dashed border-line p-10">
          <EmptyState
            title={t('noBrandsTitle')}
            body={t('noBrandsBody')}
            action={
              <Link href="/onboarding" className={buttonVariants({ size: 'sm' })}>
                {t('noBrandsCta')}
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  // An unknown or other-tenant id falls back rather than erroring: it is a
  // stale link, and the page it wants still works with a different brand.
  const selected = brands.find((b) => b.id === requested) ?? brands[0]

  const costs = Object.fromEntries(
    BUILT_CONTENT_TYPES.map((type) => [type, creditsForContent({ type })]),
  ) as Record<BuiltContentType, number>

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Header title={t('title')} subtitle={t('subtitle')} />

      <Card>
        <CardTitle>{t('composeTitle')}</CardTitle>

        {/* A plain region, not a nested Card — a card inside a card is out. */}
        <div className="mt-5">
          <BrandPicker brands={brands} selectedId={selected.id} />
        </div>

        <ContentComposer
          key={selected.id}
          projectId={selected.id}
          balance={org.creditBalance}
          costs={costs}
          variantCost={CONTENT_VARIANT_COST}
          hasPhotography={selected.hasPhotography}
        />
      </Card>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">{t('libraryTitle')}</h2>
        {/*
          No boundary here either, for the reason written out on the project
          page: a re-suspending boundary blocks the transition `router.refresh()`
          runs in, so the composer above could write a piece of content and the
          list below would not show it until the page was reloaded by hand.
        */}
        <ContentLibrary organizationId={org.id} />
      </section>
    </div>
  )
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-fg-secondary">{subtitle}</p>
    </div>
  )
}
