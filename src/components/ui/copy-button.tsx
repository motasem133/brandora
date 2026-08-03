'use client'

import { Check, Copy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Copy to clipboard, with the confirmation on the control itself.
 *
 * Nearly everything this product generates — a slogan, a caption, a hashtag
 * set, a hex code — exists to be pasted somewhere else, and the only way to get
 * it out of the page was to select it by hand. The label swaps to "Copied" for
 * two seconds rather than raising a toast: the answer belongs next to the thing
 * that was copied, not in the corner of the screen.
 */
export function CopyButton({
  value,
  label,
  showLabel = false,
  className,
}: {
  value: string
  /** What is being copied, so the accessible name is not five identical "Copy". */
  label?: string
  showLabel?: boolean
  className?: string
}) {
  const t = useTranslations('Common')
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // A component can unmount while the two-second reset is still pending.
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Clipboard access is refusable and unavailable over plain HTTP. Failing
      // silently is right here: nothing was copied, so nothing should confirm.
      return
    }

    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }, [value])

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label ? `${t('copy')} — ${label}` : t('copy')}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-control px-2 py-1 text-xs text-fg-muted transition-colors hover:bg-elevated hover:text-fg',
        copied && 'text-success hover:text-success',
        className,
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {showLabel && <span>{copied ? t('copied') : t('copy')}</span>}
      {/* Sighted users get the tick; everyone else gets this. */}
      <span className="sr-only" aria-live="polite">
        {copied ? t('copied') : ''}
      </span>
    </button>
  )
}
