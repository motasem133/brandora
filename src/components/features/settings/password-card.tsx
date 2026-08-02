'use client'

import { Check, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

export function PasswordCard() {
  const t = useTranslations('Settings')
  const ta = useTranslations('Auth')

  const formRef = useRef<HTMLFormElement>(null)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string>()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)

    const data = new FormData(event.currentTarget)
    const current = String(data.get('currentPassword'))
    const next = String(data.get('newPassword'))

    if (next.length < 8) {
      setError(ta('passwordTooShort'))
      return
    }

    setPending(true)
    const { error: authError } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      // Anyone signed in elsewhere with the old password should be turned out.
      revokeOtherSessions: true,
    })
    setPending(false)

    if (authError) {
      setError(t('wrongPassword'))
      return
    }

    formRef.current?.reset()
    setDone(true)
  }

  return (
    <Card className="space-y-4">
      <div>
        <CardTitle>{t('password')}</CardTitle>
        <CardDescription className="mt-1">{t('passwordHint')}</CardDescription>
      </div>

      <form ref={formRef} method="post" onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1.5"
            onChange={() => setDone(false)}
          />
        </div>

        <div>
          <Label htmlFor="newPassword">{ta('newPassword')}</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            className="mt-1.5"
            onChange={() => setDone(false)}
          />
        </div>

        <FieldError message={error} />

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {t('changePassword')}
          </Button>
          {done && !pending && (
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <Check className="size-3.5" />
              {t('passwordChanged')}
            </span>
          )}
        </div>
      </form>
    </Card>
  )
}
