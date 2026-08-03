'use client'

import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * The palette, where every swatch is the copy button for its own hex.
 *
 * A colour someone cannot get out of the page is a picture of a colour. The
 * whole tile is the target rather than a small icon beside it — it is the
 * largest, most obvious thing on the card, and it is what people already try
 * to click.
 */
export function PaletteGrid({ palette }: { palette: Record<string, string> }) {
  const t = useTranslations('Branding')
  const tc = useTranslations('Common')

  const [copied, setCopied] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  const copy = useCallback(async (name: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      return
    }

    setCopied(name)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(null), 2000)
  }, [])

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {Object.entries(palette).map(([name, value]) => {
        const isCopied = copied === name

        return (
          <li key={name}>
            <button
              type="button"
              onClick={() => copy(name, value)}
              aria-label={`${tc('copy')} ${name} — ${value}`}
              className="group w-full cursor-pointer text-start"
            >
              <span
                /* A strong edge, not the hairline: half these swatches are near
                   the page's own background, and a 9% border let them read as
                   holes in the card rather than as colours. */
                className="relative grid h-20 w-full place-items-center overflow-hidden rounded-control border border-line-strong transition-[transform,box-shadow] duration-200 ease-[var(--ease-out-soft)] group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-lifted)] group-focus-visible:-translate-y-0.5"
                style={{ backgroundColor: value }}
              >
                {/*
                  The confirmation sits on a swatch of unknown colour, so it
                  carries its own dark plate rather than trusting the contrast
                  of whatever the AI picked.
                */}
                {isCopied && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white animate-scale-in">
                    <Check className="size-3.5" />
                    {tc('copied')}
                  </span>
                )}
              </span>

              <span className="mt-2 block truncate text-xs capitalize text-fg-secondary">
                {name}
              </span>
              {/* A hex is not Arabic text: without the direction the hash jumps
                  to the other end and #F9FAFB reads as F9FAFB#. The alignment
                  comes back separately, so the code still sits under the label
                  rather than escaping to the far side of the tile. */}
              <span
                dir="ltr"
                className="block font-mono text-xs uppercase text-fg-muted transition-colors group-hover:text-fg rtl:text-end"
              >
                {value}
              </span>
            </button>
          </li>
        )
      })}

      {/* Announced once, rather than one live region per swatch. */}
      <li className="sr-only" aria-live="polite">
        {copied ? `${t('palette')}: ${tc('copied')}` : ''}
      </li>
    </ul>
  )
}
