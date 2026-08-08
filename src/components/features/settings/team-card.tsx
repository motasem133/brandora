'use client'

import { Loader2, UserMinus, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Link, useRouter } from '@/i18n/navigation'
import type { PendingInvitation, TeamMember } from '@/server/db/queries/members'
import { cancelInvitation, inviteMember, removeMember } from '@/server/actions/team'

/**
 * Who is in the workspace.
 *
 * This replaces a line that said inviting teammates was not available yet —
 * which was true, and had been for as long as seats appeared on the pricing
 * page.
 */
export function TeamCard({
  members,
  pending,
  seats,
  canManage,
  currentUserId,
}: {
  members: TeamMember[]
  pending: PendingInvitation[]
  /** -1 means the plan does not cap seats. */
  seats: number
  /** Owners and admins invite and remove; a member only sees the list. */
  canManage: boolean
  currentUserId: string
}) {
  const t = useTranslations('Team')
  const router = useRouter()
  const [email, setEmail] = useState('')

  const invite = useAction(inviteMember, {
    onSuccess: () => {
      setEmail('')
      router.refresh()
    },
  })
  const cancel = useAction(cancelInvitation, { onSuccess: () => router.refresh() })
  const remove = useAction(removeMember, { onSuccess: () => router.refresh() })

  const taken = members.length + pending.length
  const unlimited = seats < 0
  const full = !unlimited && taken >= seats
  /* An over-limit workspace is possible after a downgrade; say so rather than
     rendering "4 of 3" as if it were fine. */
  const over = !unlimited && members.length > seats

  return (
    <Card>
      <CardTitle>{t('title')}</CardTitle>
      <CardDescription className="mt-1">
        {unlimited ? t('seatsUnlimited', { used: taken }) : t('seatsUsed', { used: taken, seats })}
      </CardDescription>

      {over && <p className="mt-3 text-sm text-warning">{t('overLimit', { seats })}</p>}

      <ul className="mt-5 divide-y divide-line border-y border-line">
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{member.name || member.email}</p>
              <p className="truncate text-xs text-fg-muted">{member.email}</p>
            </div>
            <Badge tone={member.role === 'owner' ? 'brand' : 'neutral'}>
              {t(`role_${member.role === 'owner' ? 'owner' : member.role === 'admin' ? 'admin' : 'member'}`)}
            </Badge>
            {/* An owner cannot be removed, and nobody removes themselves here —
                leaving is a different decision from being removed. */}
            {canManage && member.role !== 'owner' && member.userId !== currentUserId && (
              <Button
                size="sm"
                variant="ghost"
                aria-label={t('remove', { name: member.name || member.email })}
                disabled={remove.isPending}
                onClick={() => remove.execute({ memberId: member.id })}
              >
                <UserMinus className="size-4" />
              </Button>
            )}
          </li>
        ))}

        {pending.map((invitation) => (
          <li key={invitation.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-fg-secondary">{invitation.email}</p>
              <p className="text-xs text-fg-muted">{t('pending')}</p>
            </div>
            {canManage && (
              <Button
                size="sm"
                variant="ghost"
                aria-label={t('cancelInvite', { email: invitation.email })}
                disabled={cancel.isPending}
                onClick={() => cancel.execute({ invitationId: invitation.id })}
              >
                <X className="size-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>

      {canManage && (
        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (email.trim()) invite.execute({ email: email.trim(), role: 'member' })
          }}
        >
          {full ? (
            /* No field, because there is no seat behind it. */
            <p className="text-sm text-fg-secondary">
              {t('seatsFull')}{' '}
              <Link href="/dashboard/billing" className="accent-text hover:underline">
                {t('seatsUpgrade')}
              </Link>
            </p>
          ) : (
            <>
              <Field label={t('inviteLabel')} hint={t('inviteHint')}>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="teammate@example.com"
                  autoComplete="off"
                />
              </Field>
              <Button
                type="submit"
                size="sm"
                className="mt-3"
                disabled={invite.isPending || email.trim().length < 3}
              >
                {invite.isPending && <Loader2 className="animate-spin" />}
                {t('sendInvite')}
              </Button>
            </>
          )}

          <FieldError
            message={
              invite.result?.serverError ?? cancel.result?.serverError ?? remove.result?.serverError
            }
          />
        </form>
      )}
    </Card>
  )
}
