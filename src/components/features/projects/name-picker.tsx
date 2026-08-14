'use client'

import { Check, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Link, useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { selectBusinessName } from '@/server/actions/branding'
import { renameAndRegenerate } from '@/server/actions/generation'

/**
 * What the already-generated work would need redoing to carry a new name.
 *
 * Absent entirely when nothing does — a brand whose run has produced no logo,
 * no site and no captions yet has nothing to warn about, and a confirmation
 * that fires on the first name anyone picks is a dialog people learn to dismiss
 * without reading.
 */
export type RenameImpact = {
  /** The name the existing work actually carries. */
  carries: string
  /** Which sections carry it, as `Generation` section keys. */
  sections: string[]
  cost: number
  balance: number
  mustVerify: boolean
  isGenerating: boolean
}

export function NamePicker({
  projectId,
  ideas,
  selected,
  impact,
}: {
  projectId: string
  ideas: { name: string; rationale: string }[]
  selected: string | null
  impact?: RenameImpact
}) {
  const t = useTranslations('Branding')
  const tc = useTranslations('Common')
  const locale = useLocale()
  const router = useRouter()

  const { execute, isPending, input } = useAction(selectBusinessName, {
    onSuccess: () => router.refresh(),
  })

  const regenerate = useAction(renameAndRegenerate, {
    onSuccess: () => router.refresh(),
  })

  /*
   * The name awaiting an answer, which is also what holds the dialog open.
   *
   * One piece of state rather than a boolean plus a value: they can only ever
   * be set and cleared together, and as two they drift — a dialog open with no
   * name is a confirmation about nothing.
   */
  const [confirming, setConfirming] = React.useState<string | null>(null)

  const [custom, setCustom] = React.useState('')
  const trimmed = custom.trim()
  const usable = trimmed.length >= 2 && trimmed.length <= 60 && trimmed !== selected

  const busy = isPending || regenerate.isPending

  /**
   * Every route to a new name comes through here.
   *
   * The five ideas and the custom field both used to call the action directly,
   * so a warning added to one of them would simply not exist on the other —
   * and the custom field is the one people rename *from*, since choosing a
   * different generated idea is usually still part of the first decision.
   */
  function requestName(name: string) {
    if (impact && name !== impact.carries) {
      setConfirming(name)
      return
    }
    execute({ projectId, name })
  }

  /* "logo, website copy and social captions" — assembled rather than written,
     so a free brand with no website is not told its website is stale. The
     locale's own conjunction and comma, which Arabic does not share. */
  const carried = impact
    ? new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(
        impact.sections.map((section) => t(`renameItems.${section}`)),
      )
    : ''

  const affordable = impact ? impact.balance >= impact.cost : false
  const blocked = impact?.isGenerating
    ? t('renameBusy')
    : impact?.mustVerify
      ? t('renameVerify')
      : !affordable
        ? t('renameNoCredits', { needed: impact?.cost ?? 0 })
        : null

  return (
    <>
      <ul className="space-y-3">
        {ideas.map((idea) => {
          const isSelected = selected === idea.name
          const saving = busy && input?.name === idea.name

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
                  onClick={() => requestName(idea.name)}
                  disabled={busy}
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
            disabled={!usable || busy}
            onClick={() => requestName(trimmed)}
          >
            {busy && input?.name === trimmed && <Loader2 className="size-3.5 animate-spin" />}
            {t('useThisName')}
          </Button>
        </div>
        <p className="mt-2 text-xs text-fg-muted">{t('customNameHint')}</p>

        {/* The refusal a blocked regeneration comes back with — no credits, an
            unverified address — said where the press happened. The name itself
            is saved by then; see the action. */}
        <FieldError message={regenerate.result?.serverError} />
      </div>

      <ConfirmDialog
        open={confirming !== null}
        pending={busy}
        onClose={() => setConfirming(null)}
        title={t('renameTitle')}
        body={
          <div className="space-y-2">
            <p>{t('renameWarning', { items: carried })}</p>

            {blocked ? (
              <p className="text-fg-muted">
                {blocked}{' '}
                {!affordable && !impact?.isGenerating && !impact?.mustVerify && (
                  <Link
                    href="/dashboard/billing"
                    className="accent-text underline underline-offset-2"
                  >
                    {t('topUp')}
                  </Link>
                )}
              </p>
            ) : (
              <p className="text-fg-muted">
                {t('renameCost', { credits: impact?.cost ?? 0, balance: impact?.balance ?? 0 })}
              </p>
            )}
          </div>
        }
        /*
         * The confirm is the answer that spends nothing, and the paid one is
         * reached for beside it. Credits are real money, so the press that
         * moves them is never the one Enter lands on.
         */
        confirmLabel={t('renameSaveOnly')}
        cancelLabel={tc('cancel')}
        secondary={{
          label: t('renameSaveAndRun'),
          disabled: Boolean(blocked),
          onSelect: () => {
            if (!confirming) return
            regenerate.execute({ projectId, name: confirming })
            setConfirming(null)
          },
        }}
        onConfirm={() => {
          if (!confirming) return
          execute({ projectId, name: confirming })
          setConfirming(null)
        }}
      />
    </>
  )
}
