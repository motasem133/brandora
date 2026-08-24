'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { FieldError } from '@/components/ui/field-error'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Link, useRouter } from '@/i18n/navigation'
import { EVENTS, capture } from '@/lib/analytics'
import {
  BUILT_CONTENT_TYPES,
  MAX_BRIEF,
  MAX_VARIANTS,
  isRenderedType,
  type BuiltContentType,
} from '@/lib/content'
import { generateContent } from '@/server/actions/content'

/**
 * The form that spends credits.
 *
 * The price and the balance are both on the control that charges, which is the
 * rule the generation panel already follows — a customer should never have to
 * go and look up what something costs after being charged for it.
 *
 * Costs arrive as a prop because the credit tables are `server-only`. The
 * server is still the authority: this only decides whether the button is worth
 * pressing.
 */
export function ContentComposer({
  projectId,
  balance,
  costs,
  variantCost,
  hasPhotography,
}: {
  projectId: string
  balance: number
  costs: Record<BuiltContentType, number>
  variantCost: number
  /**
   * Whether this brand's social kit has been generated.
   *
   * A carousel is drawn from the kit's photographs — most of the frames need
   * one — so a brand without them draws a shorter sequence. Said here because
   * this is the control that spends, and finding out afterwards that a piece
   * came back shorter than the price implies is exactly the surprise the
   * product's own rule about credits exists to prevent.
   */
  hasPhotography: boolean
}) {
  const t = useTranslations('Studio')
  const router = useRouter()

  const [type, setType] = React.useState<BuiltContentType>(BUILT_CONTENT_TYPES[0])
  const [brief, setBrief] = React.useState('')
  const [tone, setTone] = React.useState('')
  const [variants, setVariants] = React.useState(3)
  const [charged, setCharged] = React.useState<{ cost: number; balance: number } | null>(null)
  /* A queued piece has not been charged yet and has nothing to show inline, so
     the form says where it went rather than reporting a cost of zero. */
  const [queued, setQueued] = React.useState(false)

  const { executeAsync, isPending, result } = useAction(generateContent)

  /* A rendered type is one piece however many frames it draws, so it is priced
     flat and the variants control is not shown for it. */
  const rendered = isRenderedType(type)
  const estimate = costs[type] + (rendered ? 0 : (variants - 1) * variantCost)
  const affordable = balance >= estimate
  /* Only the drawn types are built out of photography, and a story is refused
     outright without it — so this is the carousel's warning. */
  const short = type === 'carousel' && !hasPhotography
  const ready = brief.trim().length >= 3 && affordable && !isPending

  /* The same wall as the generation panel's, at the other control that spends. */
  React.useEffect(() => {
    if (!affordable) capture(EVENTS.creditsExhausted, { where: 'content', needed: estimate })
  }, [affordable, estimate])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!ready) return

    setCharged(null)
    setQueued(false)

    /*
     * The row id is minted here, not on the server. It is the idempotency key
     * for the insert and for both ledger entries, so a second press of a button
     * that is already working lands on the same row and buys nothing.
     */
    const outcome = await executeAsync({
      projectId,
      contentItemId: crypto.randomUUID(),
      type,
      brief: brief.trim(),
      tone: tone.trim() || null,
      variants: rendered ? 1 : variants,
    })

    if (outcome?.data) {
      /* The retention question: a brand is bought once, content is why anyone returns. */
      capture(EVENTS.contentGenerated, { type, variants: rendered ? 1 : variants })
      if ('queued' in outcome.data && outcome.data.queued) setQueued(true)
      else setCharged({ cost: outcome.data.creditsCharged, balance: balance - outcome.data.creditsCharged })
      setBrief('')
      router.refresh()
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t('typeLabel')}>
          <Select value={type} onChange={(e) => setType(e.target.value as BuiltContentType)}>
            {BUILT_CONTENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {t(`type_${value}`)}
              </option>
            ))}
          </Select>
        </Field>

        {/*
          Variants are captions, and a carousel does not have them.

          Three captions are three angles on one topic, which is a useful thing
          to ask for. Three carousels would be three sets of five drawn images
          from one brief — fifteen renders and three times the price for a
          choice nobody asked to make. So the control is absent rather than
          disabled: a disabled control is a promise that something will unlock
          it, and nothing will.
        */}
        {!rendered && (
          /* "How many captions" is wrong on the type that makes ads, and the
             count is the one control here whose unit the customer is buying. */
          <Field label={t(type === 'ad' ? 'variantsLabelAd' : 'variantsLabel')}>
            <Select value={String(variants)} onChange={(e) => setVariants(Number(e.target.value))}>
              {Array.from({ length: MAX_VARIANTS }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      {/*
        Sixteen pixels, the same exception the logo brief claims: this is a
        sentence someone writes and reads back before it spends credits, not a
        slot they fill.
      */}
      {short && (
        <p className="text-sm text-fg-secondary">
          {t('carouselShort')}{' '}
          <Link href={`/dashboard/projects/${projectId}`} className="accent-text hover:underline">
            {t('carouselShortCta')}
          </Link>
        </p>
      )}

      <Field label={t('briefLabel')} hint={t('briefHint')}>
        <Textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          maxLength={MAX_BRIEF}
          placeholder={t('briefPlaceholder')}
          className="text-base"
          rows={3}
        />
      </Field>

      <Field label={t('toneLabel')}>
        <Textarea
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          maxLength={80}
          placeholder={t('tonePlaceholder')}
          rows={1}
          className="min-h-11"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={!ready}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t('generating')}
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              {t('generate')}
            </>
          )}
        </Button>

        <p className="text-sm text-fg-secondary">
          {affordable ? t('cost', { cost: estimate, balance }) : t('insufficient', { cost: estimate, balance })}
        </p>
      </div>

      {/* What it actually cost, where the estimate was. No toast in this app. */}
      {charged && !isPending && (
        <p className="text-sm text-success">{t('charged', charged)}</p>
      )}

      {queued && !isPending && <p className="text-sm text-fg-secondary">{t('carouselQueued')}</p>}

      <FieldError message={result?.serverError} />
    </form>
  )
}
