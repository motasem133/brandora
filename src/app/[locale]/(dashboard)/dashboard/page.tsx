import { ArrowRight, MailWarning, Sparkles } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { BrandSpecimen } from '@/components/features/projects/brand-specimen'
import { ResendVerification } from '@/components/features/settings/resend-verification'
import { StatTile } from '@/components/features/dashboard/stat-tile'
import { MomentumField, MomentumItem } from '@/components/ui/momentum'
import { buttonVariants } from '@/components/ui/button'
import { Cell } from '@/components/ui/horizon'
import { Link } from '@/i18n/navigation'
import { dashboardTrends } from '@/server/db/queries/dashboard'
import { countProjects, listBrandSpecimens } from '@/server/db/queries/projects'
import { requireOrg } from '@/server/session'

/**
 * The overview: four measured figures, then the brands in an even grid.
 *
 * This composition was banned by name in DESIGN.md and removed once, and it is
 * back on purpose. Three versions were built and measured against a
 * twelve-week, nine-brand account, and this one put six brands in the fold
 * where the contact sheet it replaced put two — the lead frame that marked the
 * newest brand cost more of the page than the figures above it do.
 *
 * What the old ban was actually about survives and still applies: tiles that
 * restate a number nobody asked for, whose largest type is the digit 1. These
 * are not that. Every one is bucketed from a real timestamp, the two that
 * measure credits decline to have an opinion about their own direction, and a
 * figure with no honest series shows no series. See DESIGN.md's Measured Figure
 * Rule, which replaced the ban.
 *
 * There is deliberately no lead frame. The reference puts uniform panels under
 * its figures, and a page that both opens with tiles and marks a hero frame is
 * arguing with itself about where to look first — and a specimen is not an
 * identical cell anyway: each one wears its own brand's paper and ink, so the
 * grid is six different objects at a glance.
 */
export default async function OverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Dashboard')
  const tp = await getTranslations('Projects')
  const ts = await getTranslations('Settings')
  const { user, org } = await requireOrg()

  const [total, specimens, trends] = await Promise.all([
    countProjects(org.id),
    listBrandSpecimens(org.id, 7),
    dashboardTrends(org.id),
  ])

  return (
    <div className="mx-auto max-w-6xl">
      {/*
        Sits above everything, because it is the one thing standing between this
        account and the product working.

        An unverified address blocks generation, and the only sign of it was a
        badge two pages away in settings — so the failure was met at the moment
        of pressing Generate, in an error that named a step with no way to take
        it. This is the same account state, said where it is discovered and with
        the control attached.
      */}
      {!user.emailVerified && (
        <section className="mb-8 rounded-panel border border-warning/30 bg-warning/[0.07] p-5">
          <div className="flex items-start gap-3.5">
            <MailWarning className="mt-0.5 size-5 shrink-0 text-warning" />
            <div className="min-w-0">
              <h2 className="font-medium text-fg">{ts('unverifiedTitle')}</h2>
              <p className="mt-1 max-w-[62ch] text-sm text-fg-secondary">
                {ts('unverifiedBody', { email: user.email })}
              </p>
              <div className="mt-4">
                <ResendVerification email={user.email} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/*
        No "New project" control here.

        It used to sit at the end of this line, and once the navigation became a
        bar with the same action lit at the end of it, the page opened with the
        product's primary action written twice within four hundred pixels. The
        one in the bar is on every screen in the app; this one was on two. The
        empty frame at the end of the grid below still offers it in place.
      */}
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
          {t('welcome', { name: user.name.split(' ')[0] })}
        </h1>
        <p className="mt-2 text-fg-secondary">{t('subtitle')}</p>
      </header>

      {/*
        The figures, and only once there is something to have figures about.

        An account on its first visit was shown four tiles of zeros above the
        words "No projects yet" — the same number said twice, once as a wall of
        nothing. The empty state below is the whole message at that point.
      */}
      {total > 0 && (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['tileBrands', trends.started, 'up-is-good'],
              ['tileRuns', trends.finished, 'up-is-good'],
              ['tileSpent', trends.spent, 'neutral'],
              ['tileCredits', trends.balance, 'neutral'],
            ] as const
          ).map(([key, series, direction]) => (
            <StatTile
              key={key}
              label={t(key)}
              series={series}
              direction={direction}
              periodLabel={t('tilePeriod')}
              trendLabel={t('tileTrend', { label: t(key) })}
              locale={locale}
            />
          ))}
        </div>
      )}

      {specimens.length === 0 ? (
        /*
         * The empty state shows the shape of what arrives rather than an icon in
         * a circle: blank frames on the app's own ground, which is what a
         * contact sheet looks like before anything has been printed on it.
         */
        <section className="mt-10 text-center">
          <div aria-hidden className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="grid min-h-40 place-items-center rounded-panel border border-dashed border-line"
                style={{ opacity: 1 - index * 0.22 }}
              >
                <Sparkles className="size-5 text-fg-muted" />
              </div>
            ))}
          </div>

          <h2 className="mt-10 font-display text-xl font-semibold">{t('emptyTitle')}</h2>
          <p className="mx-auto mt-2 max-w-[46ch] text-fg-secondary">{t('emptyBody')}</p>
          <Link href="/onboarding" className={buttonVariants({ className: 'mt-6' })}>
            {t('emptyCta')}
            <ArrowRight className="rtl:rotate-180" />
          </Link>
        </section>
      ) : (
        /*
          An even grid, and the lead frame that used to sit here is gone.

          It was defended on the grounds that "a grid of identical cells is a
          spreadsheet", which is true of cells that are chrome and false of
          these: a specimen is not a container around a row, it is the brand's
          own paper, ink and palette, so six of them are six different objects
          without any help from the layout. Measured at nine brands, marking one
          of them cost four of the others their place in the fold.
        */
        <MomentumField className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {specimens.map((specimen, index) => (
            <Cell key={specimen.project.id} index={index} lift={false}>
              <MomentumItem className="h-full">
                <BrandSpecimen specimen={specimen} locale={locale} />
              </MomentumItem>
            </Cell>
          ))}

          {/*
            The next frame, blank and waiting.

            An account with one brand left most of a contact sheet as empty
            floor — the same dead space this page was rebuilt to remove, just
            further down. A sheet's unexposed frame is the honest shape for
            "there could be another one here", and it gives the primary action a
            home inside the work rather than only in the corner.
          */}
          <Cell index={specimens.length} lift={false}>
            <Link
              href="/onboarding"
              className="group/new grid h-full min-h-56 place-items-center rounded-panel border border-dashed border-line transition-colors hover:border-brand/50 hover:bg-elevated/30"
            >
              <span className="flex flex-col items-center gap-2 text-sm text-fg-muted transition-colors group-hover/new:text-fg">
                <Sparkles className="size-5" />
                {tp('newProject')}
              </span>
            </Link>
          </Cell>
        </MomentumField>
      )}

      {total > specimens.length && (
        <div className="mt-6 text-center">
          <Link
            href="/dashboard/projects"
            className="text-sm text-fg-secondary transition-colors hover:text-fg"
          >
            {t('viewAll')}
            <ArrowRight className="ms-1.5 inline size-3.5 rtl:rotate-180" />
          </Link>
        </div>
      )}
    </div>
  )
}
