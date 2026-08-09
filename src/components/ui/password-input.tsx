'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * A password field you can look at.
 *
 * Typing a password you cannot see is a guess, and the two places it hurts
 * most are the ones where getting it wrong is silent: choosing a new one, and
 * confirming it. Every field in this app hid its own value with no way to
 * check, so the only feedback was a rejected form.
 *
 * The toggle is a real button rather than a decorated icon: it takes focus in
 * sequence, says which of the two things it will do, and never submits the
 * form it sits inside — a button with no explicit type is a submit button, and
 * pressing Enter on a hidden one is how a password gets sent half-typed.
 *
 * The state is deliberately per-field. Two fields on a change-password form ask
 * two different questions — "did I type my old one correctly" and "did I type
 * the new one twice the same" — and one shared switch answers neither.
 */
export function PasswordInput({ className, ...props }: React.ComponentProps<'input'>) {
  const t = useTranslations('Common')
  const [shown, setShown] = React.useState(false)

  return (
    <div className={cn('relative', className)}>
      {/*
        `pe-11` so a long password runs under the button rather than through
        it. Logical padding, so it is on the correct side in Arabic without a
        second rule.
      */}
      <Input {...props} type={shown ? 'text' : 'password'} className="pe-11" />

      <button
        type="button"
        onClick={() => setShown((was) => !was)}
        aria-pressed={shown}
        aria-label={shown ? t('hidePassword') : t('showPassword')}
        className={cn(
          'absolute inset-y-0 end-0 grid w-11 cursor-pointer place-items-center rounded-control',
          'text-fg-muted transition-colors hover:text-fg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        )}
      >
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
