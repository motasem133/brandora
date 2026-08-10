'use client'

import { Check, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { selectBusinessName } from '@/server/actions/branding'

export function NamePicker({
  projectId,
  ideas,
  selected,
}: {
  projectId: string
  ideas: { name: string; rationale: string }[]
  selected: string | null
}) {
  const t = useTranslations('Branding')
  const router = useRouter()

  const { execute, isPending, input } = useAction(selectBusinessName, {
    onSuccess: () => router.refresh(),
  })

  /*
   * A name of their own.
   *
   * Five ideas were the only options on offer, and a customer who liked none
   * of them — or liked one with a letter changed — had no route that did not
   * cost money: regenerate and hope, or ask the paid assistant. The action
   * this already calls takes any name between 2 and 60 characters, so the
   * ability was there and only the field was missing.
   */
  const [custom, setCustom] = React.useState('')
  const trimmed = custom.trim()
  const usable = trimmed.length >= 2 && trimmed.length <= 60 && trimmed !== selected

  return (
    <>
    <ul className="space-y-3">
      {ideas.map((idea) => {
        const isSelected = selected === idea.name
        const saving = isPending && input?.name === idea.name

        return (
          <li
            key={idea.name}
            className={cn(
              'flex items-start gap-3 rounded-control border p-3 transition-colors',
              isSelected ? 'border-brand bg-brand/5' : 'border-line',
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold">{idea.name}</p>
              <p className="mt-0.5 text-sm text-fg-secondary">{idea.rationale}</p>
            </div>

            {isSelected ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-xs font-medium accent-text">
                <Check className="size-3.5" />
                {t('chosen')}
              </span>
            ) : (
              <button
                onClick={() => execute({ projectId, name: idea.name })}
                disabled={isPending}
                className="shrink-0 rounded-control border border-line px-3 py-1.5 text-xs transition-colors hover:border-brand hover:accent-text disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : t('useThisName')}
              </button>
            )}
          </li>
        )
      })}
    </ul>

    <div className="mt-4 border-t border-line pt-4">
      <label htmlFor="custom-name" className="text-xs uppercase tracking-wide text-fg-muted">
        {t('customName')}
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          id="custom-name"
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          maxLength={60}
          placeholder={t('customNamePlaceholder')}
          className="w-full sm:w-64"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={!usable || isPending}
          onClick={() => execute({ projectId, name: trimmed })}
        >
          {isPending && input?.name === trimmed && <Loader2 className="size-3.5 animate-spin" />}
          {t('useThisName')}
        </Button>
      </div>
      <p className="mt-2 text-xs text-fg-muted">{t('customNameHint')}</p>
    </div>
    </>
  )
}
