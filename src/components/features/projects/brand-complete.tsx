'use client'

import { Check, Lock, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { EVENTS, capture } from '@/lib/analytics'

/** The locked deliverables this screen can argue for, in the order it shows them. */
export type LockedFeature = {
  /** Names the copy keys and the analytics property. Never the customer's content. */
  key: 'website' | 'kit' | 'vector'
  /** The thing itself, drawn in this brand. A server component, passed in. */
  preview: React.ReactNode
}

/**
 * The end of a run, and the only moment the product is ever this convincing.
 *
 * This replaces a card that named what had arrived and stopped there. The
 * argument for a paid plan is not a feature list — it is that everything a run
 * produces agrees with everything else, and the customer has just watched that
 * happen. So the upsell here shows the locked deliverables *drawn in the brand
 * that was generated ninety seconds ago*, which is the one place that claim can
 * be made without asking anyone to take it on faith.
 *
 * Three rules it does not break:
 *
 *  - **It is not a gate.** No modal, no scrim, no route of its own. It is a
 *    panel at the top of the work, and both the dismiss control and simply
 *    scrolling past it are valid answers. The run is finished either way and
 *    nothing below is withheld.
 *  - **It appears once, for a run that was watched.** The `justFinished`
 *    transition in `GenerationPanel` owns that, for reasons documented there:
 *    arriving at a brand generated last week must show nothing, and the
 *    freelancer on their tenth run must not be congratulated ten times a day.
 *  - **It shows nothing that is not theirs.** The name, the mark and the
 *    palette are the generated ones. The previews invent no copy — see
 *    `brand-mockups`.
 */
export function BrandComplete({
  brandName,
  sections,
  logoUrl,
  swatches,
  locked,
  onDismiss,
}: {
  brandName: string
  /** What this run actually produced, for the manifest. */
  sections: string[]
  logoUrl: string | null
  /** The generated palette, as the plate draws it along its base. */
  swatches: string[]
  /**
   * What this plan cannot have, with a picture of each.
   *
   * Empty for a plan that can have everything — the panel is then purely the
   * celebration, which is the correct behaviour for a paying customer and the
   * reason this is a list rather than a boolean.
   */
  locked: LockedFeature[]
  onDismiss: () => void
}) {
  const t = useTranslations('Generation')

  /*
   * Once per mount, and only ever once.
   *
   * React runs effects twice in development's strict mode, which would double
   * every impression in the funnel this event exists to feed — and an upsell
   * measured against an inflated denominator reads as failing when it is not.
   */
  const recorded = useRef(false)

  useEffect(() => {
    if (recorded.current) return
    recorded.current = true

    /* Properties describe the moment, never its content: how many things the
       run produced and whether there was anything to sell, not what was made. */
    capture(EVENTS.brandCompleteShown, {
      produced: sections.length,
      locked: locked.length,
    })
  }, [sections.length, locked.length])

  return (
    <Card className="space-y-7 glow-brand">
      {/*
        The end of the run, announced.

        `GenerationPanel`'s live region narrates the ninety seconds and then this
        component replaces it, taking the region out of the document with it — so
        without one here the run would be narrated step by step and then simply
        stop, which is indistinguishable from a run that died. This panel appears
        only on the transition, so it announces once and cannot repeat.
      */}
      <p role="status" aria-live="polite" className="sr-only">
        {t('liveDone', { brand: brandName })}
      </p>

      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/15">
          <Sparkles className="size-4 text-brand" />
        </span>
        <div className="min-w-0">
          <CardTitle>{t('doneTitle', { brand: brandName })}</CardTitle>
          <CardDescription className="mt-1">{t('doneBody')}</CardDescription>
        </div>
      </div>

      {/*
        The brand itself, at a glance — the mark beside the colours it was
        generated with. Small on purpose: the identity plate directly above
        this is where the brand is actually presented, and repeating it at that
        size would be the same page twice. This is a receipt, not a second
        plate.
      */}
      {(logoUrl || swatches.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-control border border-line bg-elevated/40 p-4">
          {logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logoUrl} alt="" className="size-12 shrink-0 object-contain" />
          )}

          <div className="min-w-0">
            <p dir="auto" className="truncate font-display font-semibold">
              {brandName}
            </p>
            {swatches.length > 0 && (
              <div aria-hidden className="mt-2 flex gap-1.5">
                {swatches.map((hex, index) => (
                  <span
                    key={`${hex}-${index}`}
                    className="size-5 rounded-full ring-1 ring-line"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* What arrived, named — the run's own manifest rather than a count. */}
      <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {sections.map((section) => (
          <li key={section} className="flex items-center gap-2.5">
            <Check className="size-4 shrink-0 text-success" />
            <span className="text-fg-secondary">{t(`produced.${section}`)}</span>
          </li>
        ))}
      </ul>

      {locked.length > 0 && (
        <section className="space-y-4 border-t border-line pt-6">
          <div>
            <CardTitle level={3}>{t('lockedTitle')}</CardTitle>
            <CardDescription className="mt-1 max-w-[68ch]">{t('lockedBody')}</CardDescription>
          </div>

          <ul className="space-y-4">
            {locked.map((feature) => (
              <li
                key={feature.key}
                className="space-y-3 rounded-control border border-line p-4"
              >
                {feature.preview}

                <div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Lock className="size-3.5 shrink-0 text-fg-muted" />
                    {t(`locked.${feature.key}.title`)}
                  </p>
                  <p className="mt-1 text-sm text-fg-secondary">
                    {t(`locked.${feature.key}.benefit`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/*
            A Link, not a Button with a router push: this is navigation, so it
            has to be middle-clickable and it has to show its target in the
            status bar. The event fires on the way out.

            `/dashboard/billing` rather than the public pricing page, because
            this customer is signed in — the marketing page would ask them to
            start an account they already have. It is the same destination every
            other locked surface in the product points at.
          */}
          <Link
            href="/dashboard/billing"
            onClick={() =>
              capture(EVENTS.brandCompleteUpgrade, { locked: locked.length })
            }
            className={buttonVariants({ size: 'lg' })}
          >
            <Sparkles />
            {t('lockedCta')}
          </Link>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={locked.length > 0 ? 'secondary' : 'primary'}
          onClick={() => {
            document.getElementById('brand')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            onDismiss()
          }}
        >
          {t('doneCta')}
        </Button>
        <Button variant="ghost" onClick={onDismiss}>
          {t('doneDismiss')}
        </Button>
      </div>
    </Card>
  )
}
