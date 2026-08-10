'use client'

import { Loader2, Pencil } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from '@/i18n/navigation'
import { BRAND_COPY_BOUNDS as bounds, brandCopy, type BrandCopyField } from '@/lib/validations/brand'
import { updateBrandCopy } from '@/server/actions/branding'

/**
 * The brand's own words, editable by the person who owns them.
 *
 * These rendered as read-only text on every plan, which left one honest route
 * to changing a single word — the paid assistant — and one dishonest one:
 * spend credits regenerating a whole section and hope the new version is
 * better. This is the cheapest satisfaction fix in the product, and it removes
 * the worst first impression it can make: a free user who likes everything
 * except one line.
 *
 * One field is open at a time. Not a rule about forms — it is what stops a
 * page of textareas appearing where a page of finished work should be, and it
 * keeps the read view, which is what this section is mostly for, intact.
 *
 * Bounds come from `validations/brand`, which is also what the assistant's
 * tools are held to. Checking them here as well as on the server is not
 * belt-and-braces: a story is 150 characters minimum, and finding that out
 * after a round trip, having written 140, is the wrong moment to be told.
 */
export function BrandCopy({
  projectId,
  slogan,
  brandStory,
  brandVoice,
  brandValues,
  /**
   * The support view renders the same fields and must not offer to change
   * them. Support looks; it does not reach in — every control on that screen
   * would be an `orgAction` scoped to the administrator's own workspace, so
   * the kindest outcome is a button that errors.
   *
   * A flag rather than a second read-only copy of this markup, because the two
   * would drift, and the one that drifts is the one nobody looks at.
   */
  readOnly = false,
}: {
  projectId: string
  slogan: string | null
  brandStory: string | null
  brandVoice: string | null
  brandValues: string[]
  readOnly?: boolean
}) {
  const t = useTranslations('Branding')
  const tc = useTranslations('Common')
  const router = useRouter()

  const [editing, setEditing] = React.useState<BrandCopyField | null>(null)
  const [draft, setDraft] = React.useState('')
  const [problem, setProblem] = React.useState<string>()

  const { executeAsync, isPending } = useAction(updateBrandCopy)

  function open(field: BrandCopyField, current: string) {
    setEditing(field)
    setDraft(current)
    setProblem(undefined)
  }

  function close() {
    setEditing(null)
    setProblem(undefined)
  }

  async function save(field: BrandCopyField) {
    /*
     * Values are typed as one line and stored as a list. A row of three chips
     * is not worth a repeater with add and remove buttons — it is three short
     * words, and a comma is how anybody would write them.
     */
    const value =
      field === 'brandValues'
        ? draft.split(',').map((entry) => entry.trim()).filter(Boolean)
        : draft.trim()

    const parsed = brandCopy[field].safeParse(value)
    if (!parsed.success) {
      setProblem(
        field === 'brandValues'
          ? t('valuesCount')
          : t('copyLength', { min: bounds[field].min, max: bounds[field].max }),
      )
      return
    }

    const outcome = await executeAsync({ projectId, patch: { [field]: parsed.data } })
    if (outcome?.serverError) {
      setProblem(outcome.serverError)
      return
    }

    close()
    router.refresh()
  }

  const rows: { field: BrandCopyField; label: string; empty: boolean }[] = [
    { field: 'slogan', label: t('slogan'), empty: !slogan },
    { field: 'brandStory', label: t('story'), empty: !brandStory },
    { field: 'brandVoice', label: t('voice'), empty: !brandVoice },
    { field: 'brandValues', label: t('values'), empty: brandValues.length === 0 },
  ]

  return (
    <div className="space-y-6">
      {rows.map(({ field, label, empty }) => {
        const isOpen = editing === field

        return (
          <div key={field}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs uppercase tracking-wide text-fg-muted">{label}</h3>

              {!isOpen && !readOnly && (
                <button
                  type="button"
                  onClick={() => open(field, currentFor(field))}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-control px-2 py-1 text-xs text-fg-muted transition-colors hover:text-fg"
                >
                  <Pencil className="size-3.5" />
                  {tc('edit')}
                </button>
              )}
            </div>

            {isOpen ? (
              <div className="mt-2 space-y-3">
                {field === 'slogan' || field === 'brandValues' ? (
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    /* Values are one line of up to five entries plus ", ". */
                    maxLength={
                      field === 'slogan'
                        ? bounds.slogan.max
                        : bounds.brandValues.max * (bounds.brandValues.itemMax + 2)
                    }
                    aria-label={label}
                    autoFocus
                  />
                ) : (
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    maxLength={bounds[field].max}
                    rows={field === 'brandStory' ? 8 : 3}
                    aria-label={label}
                    autoFocus
                  />
                )}

                <p className="text-xs text-fg-muted">
                  {field === 'brandValues'
                    ? t('valuesHint')
                    : t('copyLength', { min: bounds[field].min, max: bounds[field].max })}
                </p>

                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => save(field)} disabled={isPending}>
                    {isPending && <Loader2 className="size-3.5 animate-spin" />}
                    {isPending ? tc('saving') : tc('save')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={close} disabled={isPending}>
                    {tc('cancel')}
                  </Button>
                </div>

                <FieldError message={problem} />
              </div>
            ) : (
              <ReadView field={field} empty={empty} />
            )}
          </div>
        )
      })}
    </div>
  )

  /** What the editor opens with — the stored value, in the shape it is typed. */
  function currentFor(field: BrandCopyField) {
    if (field === 'slogan') return slogan ?? ''
    if (field === 'brandStory') return brandStory ?? ''
    if (field === 'brandVoice') return brandVoice ?? ''
    return brandValues.join(', ')
  }

  function ReadView({ field, empty }: { field: BrandCopyField; empty: boolean }) {
    if (empty) return <p className="mt-1 text-sm text-fg-muted">{t('copyEmpty')}</p>

    if (field === 'brandValues') {
      return (
        <ul className="mt-2 flex flex-wrap gap-2">
          {brandValues.map((value) => (
            <li key={value} className="rounded-full bg-elevated px-3 py-1 text-sm">
              {value}
            </li>
          ))}
        </ul>
      )
    }

    if (field === 'brandStory') {
      return (
        <div className="mt-1 space-y-3 text-sm leading-relaxed text-fg-secondary">
          {brandStory!
            .split('\n')
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
        </div>
      )
    }

    return (
      <p className="mt-1 text-sm leading-relaxed text-fg-secondary">
        {field === 'slogan' ? slogan : brandVoice}
      </p>
    )
  }
}
