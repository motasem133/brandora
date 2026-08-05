'use client'

import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'

import { Badge } from '@/components/ui/badge'
import { TD, TRowHeader } from '@/components/ui/table'
import { useRouter } from '@/i18n/navigation'
import { updateUserRole, updateUserStatus } from '@/server/actions/admin'

type User = {
  id: string
  name: string
  email: string
  role: string
  status: string
  email_verified: boolean
  org_name: string | null
  projects: number
}

export function UserRow({ user, isSelf }: { user: User; isSelf: boolean }) {
  const t = useTranslations('Admin')
  const router = useRouter()

  const status = useAction(updateUserStatus, { onSuccess: () => router.refresh() })
  const role = useAction(updateUserRole, { onSuccess: () => router.refresh() })
  const busy = status.isPending || role.isPending

  return (
    <tr>
      {/* The person is what this row is about, so their cell heads it. */}
      <TRowHeader>
        <span className="font-medium">{user.name}</span>
        <span className="mt-0.5 block text-xs text-fg-muted">{user.email}</span>
      </TRowHeader>
      <TD className="text-fg-secondary">{user.org_name ?? '—'}</TD>
      <TD align="end" className="tabular-nums">
        {user.projects}
      </TD>
      <TD>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={user.status === 'active' ? 'success' : 'danger'}>
            {t(`users.filters.${user.status}`)}
          </Badge>
          {user.role === 'admin' && <Badge tone="brand">{t('users.admin')}</Badge>}
          {!user.email_verified && <Badge tone="warning">{t('users.unverified')}</Badge>}
        </div>
      </TD>
      <TD align="end">
        {isSelf ? (
          // Suspending or demoting yourself could lock the platform's last
          // administrator out through its own UI.
          <span className="text-xs text-fg-muted">{t('users.you')}</span>
        ) : (
          /*
            Real controls, not 12px text.

            Suspending an account and granting it administration are the two
            most consequential things anyone can do in this product, and they
            were bare text with no hit area to speak of — under the 44px floor
            every other control in the system clears, and carrying none of the
            light that now says "this can be pressed". They are Buttons.
          */
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                status.execute({
                  userId: user.id,
                  status: user.status === 'active' ? 'suspended' : 'active',
                })
              }
              className="hover:text-danger"
            >
              {busy && <Loader2 className="animate-spin" />}
              {user.status === 'active' ? t('users.suspend') : t('users.activate')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                role.execute({ userId: user.id, role: user.role === 'admin' ? 'user' : 'admin' })
              }
              className="hover:accent-text"
            >
              {user.role === 'admin' ? t('users.demote') : t('users.promote')}
            </Button>
          </div>
        )}
      </TD>
    </tr>
  )
}
