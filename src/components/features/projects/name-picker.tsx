'use client'

import { Check, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'

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

  return (
    <ul className="space-y-3">
      {ideas.map((idea) => {
        const isSelected = selected === idea.name
        const saving = isPending && input?.name === idea.name

        return (
          <li
            key={idea.name}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3 transition-colors',
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
                className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs transition-colors hover:border-brand hover:accent-text disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : t('useThisName')}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
