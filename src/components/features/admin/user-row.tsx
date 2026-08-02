'use client'

import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'

import { Badge } from '@/components/ui/badge'
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
      <td className="p-4">
        <p className="font-medium">{user.name}</p>
        <p className="text-xs text-fg-muted">{user.email}</p>
      </td>
      <td className="p-4 text-fg-secondary">{user.org_name ?? '—'}</td>
      <td className="p-4 text-end">{user.projects}</td>
      <td className="p-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={user.status === 'active' ? 'success' : 'danger'}>
            {t(`users.filters.${user.status}`)}
          </Badge>
          {user.role === 'admin' && <Badge tone="brand">{t('users.admin')}</Badge>}
          {!user.email_verified && <Badge tone="warning">{t('users.unverified')}</Badge>}
        </div>
      </td>
      <td className="p-4 text-end">
        {isSelf ? (
          // Suspending or demoting yourself could lock the platform's last
          // administrator out through its own UI.
          <span className="text-xs text-fg-muted">{t('users.you')}</span>
        ) : (
          <div className="flex justify-end gap-3">
            <button
              disabled={busy}
              onClick={() =>
                status.execute({
                  userId: user.id,
                  status: user.status === 'active' ? 'suspended' : 'active',
                })
              }
              className="text-xs text-fg-secondary hover:text-danger disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-3 animate-spin" /> : user.status === 'active' ? t('users.suspend') : t('users.activate')}
            </button>
            <button
              disabled={busy}
              onClick={() =>
                role.execute({ userId: user.id, role: user.role === 'admin' ? 'user' : 'admin' })
              }
              className="text-xs text-fg-secondary hover:text-brand disabled:opacity-50"
            >
              {user.role === 'admin' ? t('users.demote') : t('users.promote')}
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
