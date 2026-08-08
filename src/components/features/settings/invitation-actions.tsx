'use client'

import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'

import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { useRouter } from '@/i18n/navigation'
import { acceptInvitation, rejectInvitation } from '@/server/actions/team'

/**
 * Join, or decline.
 *
 * A client component because accepting must happen in a server *action*:
 * `auth.api.acceptInvitation` sets the active organization by writing a session
 * cookie, and `nextCookies()` only flushes those from an action or route
 * handler. Called during a page render the cookie is dropped silently and the
 * new member lands back in their own empty workspace.
 */
export function InvitationActions({
  invitationId,
  workspace,
}: {
  invitationId: string
  workspace: string
}) {
  const t = useTranslations('Team')
  const router = useRouter()

  const accept = useAction(acceptInvitation, {
    onSuccess: () => {
      router.push('/dashboard')
      router.refresh()
    },
  })

  const reject = useAction(rejectInvitation, {
    onSuccess: () => router.push('/dashboard'),
  })

  const busy = accept.isPending || reject.isPending

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="sm" disabled={busy} onClick={() => accept.execute({ invitationId })}>
          {accept.isPending && <Loader2 className="animate-spin" />}
          {t('inviteAccept', { workspace })}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => reject.execute({ invitationId })}
        >
          {t('inviteDecline')}
        </Button>
      </div>

      <FieldError message={accept.result?.serverError ?? reject.result?.serverError} />
    </>
  )
}
