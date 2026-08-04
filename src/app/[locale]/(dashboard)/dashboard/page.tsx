import { ArrowRight, MailWarning, Sparkles } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { BrandSpecimen } from '@/components/features/projects/brand-specimen'
import { ResendVerification } from '@/components/features/settings/resend-verification'
import { MomentumField, MomentumItem } from '@/components/ui/momentum'
import { buttonVariants } from '@/components/ui/button'
import { Cell } from '@/components/features/landing/horizon'
import { Link } from '@/i18n/navigation'
import {
  countProjects,
  countProjectsByStatus,
  listBrandSpecimens,
} from '@/server/db/queries/projects'
import { requireOrg } from '@/server/session'

/**
 * The overview, as a contact sheet of the brands this account has made.
 *
 * What it replaces was three tiles reading "1", "1" and "500" above a thin row
 * of cards — the arrangement every admin template ships, and one that told a
 * customer nothing about the only thing they came here for. Counts are facts
 * about the account, not about the work, so they sit on one line of meta; the
 * page itself is given over to the brands, each printed as itself.
 */
export default async function OverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Dashboard')
  const tp = await getTranslations('Projects')
  const ts = await getTranslations('Settings')
  const { user, org } = await requireOrg()

  const [total, completed, specimens] = await Promise.all([
    countProjects(org.id),
    countProjectsByStatus(org.id, 'completed'),
    listBrandSpecimens(org.id, 7),
  ])

  /*
   * A lead frame needs a sheet to lead. With one or two brands the wide cell
   * left a column of nothing beside it and put the dead space back, one screen
   * further along than where it was removed from.
   */
  const lead = specimens.length >= 3

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

      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            {t('welcome', { name: user.name.split(' ')[0] })}
          </h1>
          <p className="mt-2 text-fg-secondary">{t('subtitle')}</p>
        </div>

        <Link href="/onboarding" className={buttonVariants()}>
          <Sparkles />
          {tp('newProject')}
        </Link>
      </header>

      {/*
        The counts, once, as a line of meta.

        These were three cards the width of the page, which made the largest
        type on the screen the digit 1. They are true and worth knowing, and
        that is the whole of what they earn.
      */}
      {total > 0 && (
        <dl className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-2 border-y border-line py-3.5 text-sm">
          {[
            [t('statProjects'), total],
            [t('statCompleted'), completed],
            [t('statCredits'), org.creditBalance],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-baseline gap-2">
              <dt className="text-fg-muted">{label}</dt>
              <dd className="font-semibold tabular-nums text-fg">{value}</dd>
            </div>
          ))}
        </dl>
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
        <MomentumField className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {specimens.map((specimen, index) => (
            <Cell
              key={specimen.project.id}
              index={index}
              lift={false}
              /*
                The newest brand is the lead frame, printed across two columns.
                A contact sheet marks the frame worth looking at; a grid of
                identical cells is a spreadsheet.
              */
              className={index === 0 && lead ? 'sm:col-span-2' : undefined}
            >
              <MomentumItem className="h-full">
                <BrandSpecimen specimen={specimen} locale={locale} feature={index === 0 && lead} />
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
