'use client'

import { Check, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { updateLogoBrief } from '@/server/actions/branding'

export function LogoBrief({ projectId, brief }: { projectId: string; brief: string | null }) {
  const t = useTranslations('Branding')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [saved, setSaved] = useState(false)

  const { execute, isPending, result } = useAction(updateLogoBrief, {
    onSuccess: () => setSaved(true),
  })

  return (
    <div className="rounded-lg border border-line p-4">
      <label htmlFor="logo-brief" className="block text-sm font-medium">
        {t('briefTitle')}
      </label>
      <p className="mt-0.5 text-sm text-fg-secondary">{t('briefHint')}</p>

      <textarea
        id="logo-brief"
        ref={inputRef}
        defaultValue={brief ?? ''}
        onChange={() => setSaved(false)}
        rows={3}
        maxLength={600}
        placeholder={t('briefPlaceholder')}
        className="mt-3 w-full resize-y rounded-lg border border-line bg-surface px-3.5 py-3 text-sm focus:border-brand focus:outline-none"
      />

      <div className="mt-2 flex items-center gap-3">
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => execute({ projectId, brief: inputRef.current?.value ?? '' })}
        >
          {isPending && <Loader2 className="animate-spin" />}
          {t('saveBrief')}
        </Button>

        {saved && !isPending && (
          <span className="inline-flex items-center gap-1 text-xs text-success">
            <Check className="size-3.5" />
            {t('briefSaved')}
          </span>
        )}
      </div>

      <FieldError message={result?.serverError} />
    </div>
  )
}
