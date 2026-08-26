import { ArrowRight, MailWarning, Sparkles } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { BrandSpecimen } from '@/components/features/projects/brand-specimen'
import { EmailVerification } from '@/components/features/settings/email-verification'
import { MomentumField, MomentumItem } from '@/components/ui/momentum'
import { buttonVariants } from '@/components/ui/button'
import { Cell } from '@/components/ui/horizon'
import { Tacked } from '@/components/ui/tacked'
import { Link } from '@/i18n/navigation'
import { formatDate } from '@/lib/utils'
import { countProjects, listBrandSpecimens } from '@/server/db/queries/projects'
import { requireOrg } from '@/server/session'

/**
 * The wall: every brand this account has made, hung on one surface.
 *
 * The four measured figures that used to open this page are gone, and the
 * Measured Figure Rule that earned them is not being overturned by taste — the
 * page they were measured against no longer exists. They won a contest about
 * how to open a *dark room* full of chrome cards, where the tiles put six
 * brands in the fold against a contact sheet's two. On the board a specimen is
 * already the brand's own paper with its own palette along the base, so the
 * work does that job on its own, and the tiles were spending the first screen
 * telling a four-brand account it has four brands. What they measured is still
 * available on request; what they cost is the top of every visit.
 *
 * Credits are the one figure that was load-bearing and it has not moved: it is
 * in the bar, on every screen, beside the control that spends it.
 *
 * The brands are packed into columns rather than laid in an even grid, so a
 * sheet takes the height of what is on it. An even grid makes six brands one
 * object repeated; unequal sheets on one surface make them six.
 */
export default async function OverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Dashboard')
  const tp = await getTranslations('Projects')
  const ts = await getTranslations('Settings')
  const { user, org } = await requireOrg()

  const [total, specimens] = await Promise.all([
    countProjects(org.id),
    listBrandSpecimens(org.id, 7),
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
                <EmailVerification email={user.email} />
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
        <MomentumField className="mt-9 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-6">
          {/*
            Three columns packed by hand rather than a grid, so each sheet keeps
            the height of what is on it. `columns` was tried first and clipped
            the pins: they are absolutely positioned on the frame's edge, and
            CSS fragmentation does not carry them across a column break.
          */}
          {[0, 1, 2].map((column) => (
            <div key={column} className="flex min-w-0 flex-1 flex-col gap-7">
              {/*
                Round-robin left holes: with four brands and the blank frame
                pinned to the last column, the middle one ended a whole sheet
                short and the wall read as unfinished rather than as unequal.
                Filling column by column keeps the shortest one last, which is
                where the blank frame wants to be anyway.
              */}
              {specimens
                .map((specimen, index) => ({ specimen, index }))
                .filter(({ index }) => {
                  const perColumn = Math.ceil((specimens.length + 1) / 3)
                  return Math.floor(index / perColumn) === column
                })
                .map(({ specimen, index }) => (
                  <Cell key={specimen.project.id} index={index} lift={false}>
                    <MomentumItem>
                      {/*
                        The caption says what the sheet cannot.

                        It repeated the brand's own name at first, printed under
                        a sheet already showing that name at four times the size
                        — a label restating its subject, which is the definition
                        of decoration. What a wall can say that a sheet cannot is
                        what is *not* on it, so the caption carries the gap and
                        the date moves to the end where every other figure sits.
                      */}
                      <Tacked
                        caption={
                          specimen.missing.website || specimen.missing.kit
                            ? t('wallMissing', {
                                parts: [
                                  specimen.missing.website ? t('wallWebsite') : null,
                                  specimen.missing.kit ? t('wallKit') : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · '),
                              })
                            : t('wallComplete')
                        }
                        meta={formatDate(specimen.project.createdAt, locale)}
                      >
                        <BrandSpecimen specimen={specimen} locale={locale} />
                      </Tacked>
                    </MomentumItem>
                  </Cell>
                ))}

              {/*
                The next frame, blank and waiting, at the foot of the shortest
                column — which on a three-column wall is the last one.

                A sheet's unexposed frame is the honest shape for "there could be
                another one here", and it gives the primary action a home inside
                the work rather than only in the corner of the bar.
              */}
              {column === 2 && (
                <Cell index={specimens.length} lift={false}>
                  <Tacked caption={tp('newProject')}>
                    <Link
                      href="/onboarding"
                      className="group/new grid min-h-44 place-items-center rounded-card transition-shadow"
                      style={{
                        background:
                          'repeating-linear-gradient(-45deg, color-mix(in srgb, var(--brand-primary) 5%, transparent) 0 9px, transparent 9px 18px)',
                        boxShadow:
                          'inset 0 0 0 1.5px color-mix(in srgb, var(--brand-primary) 28%, transparent)',
                      }}
                    >
                      <span className="flex flex-col items-center gap-2 text-sm text-fg-secondary transition-colors group-hover/new:text-fg">
                        <Sparkles className="size-5" />
                        {tp('newProject')}
                      </span>
                    </Link>
                  </Tacked>
                </Cell>
              )}
            </div>
          ))}
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
