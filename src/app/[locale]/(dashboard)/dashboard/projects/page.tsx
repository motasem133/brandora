import { ArrowRight, Sparkles } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'

import { BrandSpecimen } from '@/components/features/projects/brand-specimen'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Cell } from '@/components/ui/horizon'
import { MomentumField, MomentumItem } from '@/components/ui/momentum'
import { Link } from '@/i18n/navigation'
import { listBrandSpecimens } from '@/server/db/queries/projects'
import { requireOrg } from '@/server/session'

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Projects')

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* The same action is lit at the end of the app bar on every screen; a
          second copy here said it twice. The empty state below still carries
          its own, because a page with nothing on it needs one. */}
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-1 text-sm text-fg-secondary">{t('subtitle')}</p>
      </div>

      {/*
        Scoped to the list rather than declared as a route-level loading.tsx.
        A loading.tsx here would cover the whole segment including
        /projects/[id], and a segment that streams answers 200 before it knows
        the project exists — which turned a cross-tenant 404 into a 200.
      */}
      <Suspense fallback={<ProjectsSkeleton label={t('loading')} />}>
        <ProjectList locale={locale} />
      </Suspense>
    </div>
  )
}

async function ProjectList({ locale }: { locale: string }) {
  const t = await getTranslations('Projects')
  const { org } = await requireOrg()
  const specimens = await listBrandSpecimens(org.id)

  if (specimens.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-line">
        {/* An empty state with nothing to press is a dead end: this one stated
            that there were no brands and left the visitor to find the way to
            making one somewhere else on the page. */}
        <EmptyState
          icon={<Sparkles className="size-6" />}
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <Link href="/onboarding" className={buttonVariants({ size: 'sm' })}>
              {t('emptyCta')}
              <ArrowRight className="rtl:rotate-180" />
            </Link>
          }
        />
      </div>
    )
  }

  /*
    The grid is the field so that a card entered on the way past knows how the
    pointer was travelling — a card can only measure velocity it was there for,
    and by the time one is entered the movement that mattered has happened
    somewhere else in the grid.

    `lift={false}`: the cards now answer the hover themselves, and a wrapper
    that also lifts would carry the card out from under the cursor and make it
    enter itself again.
  */
  return (
    <MomentumField className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {specimens.map((specimen, index) => (
        <Cell key={specimen.project.id} index={index} lift={false}>
          <MomentumItem className="h-full">
            <BrandSpecimen specimen={specimen} locale={locale} />
          </MomentumItem>
        </Cell>
      ))}
    </MomentumField>
  )
}

/** Same shapes as the specimens it stands in for, so nothing jumps on arrival. */
function ProjectsSkeleton({ label }: { label: string }) {
  return (
    /*
      Named for assistive technology, which the shimmer alone never was — and
      under `prefers-reduced-motion` the shimmer is gone entirely, so without
      this the loading state is three silent grey boxes.
    */
    <div role="status" aria-label={label} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex min-h-64 flex-col overflow-hidden rounded-panel ring-1 ring-line"
        >
          <div className="flex-1 bg-elevated shimmer-surface" />
          <div className="space-y-2 p-6">
            <div className="h-5 w-2/3 rounded bg-elevated shimmer-surface" />
            <div className="h-4 w-1/2 rounded bg-elevated shimmer-surface" />
          </div>
          <div className="h-2.5 bg-elevated shimmer-surface" />
        </div>
      ))}
    </div>
  )
}
