'use client'

import { Check, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'

import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/navigation'
import { selectPrimaryLogo } from '@/server/actions/branding'

/**
 * The decision the whole branding screen exists to support.
 *
 * These were 12px text links under a thumbnail — the most consequential control
 * on the page rendered as the least prominent thing on it. On the canvas they
 * are buttons, and the chosen state stays in place rather than disappearing, so
 * the row never changes shape under the pointer.
 *
 * The unchosen state is the section's one emphatic control. It was a small
 * secondary chip while an export ("Download brand kit") and an unrelated action
 * ("New project") were full gradient buttons in the same viewport — two things
 * outranking the decision the page exists to support.
 */
export function SelectLogoButton({
  projectId,
  fileId,
  isPrimary,
}: {
  projectId: string
  fileId: string
  isPrimary: boolean
}) {
  const t = useTranslations('Branding')

  /*
   * `executeAsync` and a full reload, rather than a callback and a refresh.
   *
   * The callback route does not work here, and it was measured rather than
   * assumed: a probe inside `onSuccess` never ran while the same component's
   * render probe did, on an action that completed and wrote to the database.
   * `result.data` never arrived either. So `router.refresh()` was never called,
   * the page went on showing "Use this logo" after the choice was saved, and
   * only a manual reload revealed it — which is exactly what people were doing.
   *
   * `executeAsync` returns a promise, so the outcome is known without relying
   * on either.
   *
   * The reload this used to end with is now a refresh. The reason it was a
   * reload — "a soft refresh re-rendered the component and did not commit" —
   * was real and had a cause: a Suspense boundary further down the page blocked
   * the transition the refresh runs in. That boundary is gone, so the soft path
   * commits, and choosing a logo no longer throws away the page to show that it
   * worked.
   */
  const router = useRouter()
  const { executeAsync, isPending } = useAction(selectPrimaryLogo)

  async function choose() {
    const outcome = await executeAsync({ projectId, fileId })
    if (outcome?.data) router.refresh()
  }

  if (isPrimary) {
    /*
     * `aria-disabled`, not `disabled`. A disabled button leaves the tab order,
     * so a keyboard or screen-reader user tabbed straight past the canvas and
     * never learned which concept is the brand's — the page's most important
     * piece of state, unreachable. It stays focusable and announces itself;
     * `aria-disabled` is what tells assistive tech it is not actionable, and
     * there is no handler to guard because this branch has none.
     */
    return (
      <Button
        variant="secondary"
        aria-disabled
        className="cursor-default opacity-100"
      >
        <Check className="text-brand" />
        {t('chosen')}
      </Button>
    )
  }

  return (
    <Button disabled={isPending} onClick={choose}>
      {isPending && <Loader2 className="animate-spin" />}
      {t('useThisLogo')}
    </Button>
  )
}

/**
 * Marks a concept as the icon — what gets used where text will not fit.
 *
 * Clicking the current icon clears it, so the favicon falls back to the logo
 * itself rather than needing a separate "none" control.
 */
