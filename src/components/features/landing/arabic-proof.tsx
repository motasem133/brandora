'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Arabic, shown rather than claimed.
 *
 * The product's sharpest differentiator had no presence on this page at all —
 * the copy for it (`arabicTitle` / `arabicBody`) sat unreferenced in both
 * catalogues while the page never mentioned that the thing works in Arabic.
 *
 * What this does *not* do is invent an Arabic wordmark. Sultana's run produced
 * four marks and all four are Latin; there is no generated Arabic artwork in
 * this repo, and manufacturing one for the section that promises native Arabic
 * generation would be the worst possible place to put a mockup.
 *
 * So the demonstration is the honest one available: the brief itself, in both
 * languages, with the panel's direction, alignment and font stack all following
 * the language rather than being mirrored afterwards. That is exactly the claim
 * — the run starts in the language it was briefed in — and every string here is
 * a real brief field, written in Arabic rather than translated into it.
 */

export type BriefStrings = {
  labelBusiness: string
  labelMarket: string
  labelStyle: string
  business: string
  market: string
  style: string
}

export function ArabicProof({
  en,
  ar,
  toggleAria,
}: {
  en: BriefStrings
  ar: BriefStrings
  toggleAria: string
}) {
  const [lang, setLang] = React.useState<'en' | 'ar'>('ar')
  const active = lang === 'ar' ? ar : en

  const rows = [
    { label: active.labelBusiness, value: active.business },
    { label: active.labelMarket, value: active.market },
    { label: active.labelStyle, value: active.style },
  ]

  const options = [
    { id: 'en' as const, label: 'English' },
    { id: 'ar' as const, label: 'العربية' },
  ]

  return (
    <div className="lit [--lit-radius:var(--radius-panel)]">
      <div className="lit-inner p-6 sm:p-8">
        {/*
          A radio group, not two buttons.

          The choice is one-of-two and mutually exclusive, which is what a radio
          group is; built from buttons it would announce as two unrelated
          controls and give a keyboard user two tab stops for one decision.
        */}
        <div role="radiogroup" aria-label={toggleAria} className="flex gap-2">
          {options.map((option) => {
            const current = lang === option.id

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={current}
                onClick={() => setLang(option.id)}
                lang={option.id}
                className={cn(
                  /* A radio a thumb has to hit, so it takes the 44px floor
                     rather than the 34px its label alone would give it. */
                  'inline-flex min-h-11 items-center rounded-full border px-5 text-sm transition-colors',
                  current
                    ? 'control-lit border-line-strong bg-elevated text-fg'
                    : 'border-line text-fg-secondary hover:text-fg',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        {/*
          `dir` and `lang` on the block, not on the page.

          Setting them here is what makes this a demonstration: the labels move
          to the other edge, the values align to it, and the Arabic font stack
          takes over with its own leading — all of it the same behaviour every
          screen in the product has, happening in one panel a visitor can drive.
        */}
        <dl
          key={lang}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          lang={lang}
          className="animate-fade-in mt-7 space-y-4 border-t border-line pt-6"
        >
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-1 sm:flex-row sm:gap-5">
              <dt className="type-eyebrow w-28 shrink-0 pt-1 text-fg-muted">{row.label}</dt>
              <dd className="text-lg text-fg">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
