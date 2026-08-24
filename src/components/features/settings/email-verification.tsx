'use client'

import { Check, Loader2, Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/navigation'
import { authClient } from '@/lib/auth-client'
import { OTP_MINUTES } from '@/lib/otp'
import { cn } from '@/lib/utils'
import { ensureVerificationCode } from '@/server/actions/settings'

const LENGTH = 6

/**
 * Verification, finished on the page it is blocking.
 *
 * This replaced a link. A link cannot verify in place: it opens a second tab,
 * confirms the address there, and leaves the tab the customer was working in
 * still rendering "unverified" — so every surface that gated on verification
 * had to poll for the answer, and the customer had to work out that the reason
 * the button was still disabled was that they needed to reload. A code is typed
 * into the blocked page, so that page is told directly and unlocks itself.
 *
 * `autoSend` is set where this panel is *blocking* something. Sign-up sends a
 * code that lives ten minutes, and the first run is not gated — so the box a
 * customer actually meets is the one in front of their second run, hours or
 * days later, by which time the code they were sent is always dead. It used to
 * open "ready to receive" that code and say nothing, which left the secondary
 * button as the real first step and no reason to press it. The action behind
 * this sends only when no live code exists, so a reload cannot mail anyone
 * twice.
 *
 * Off where the panel is an invitation rather than a wall — the settings page
 * and the dashboard card — because sending an email to someone who is reading
 * a page is not the same as sending one to someone who is stuck.
 */
export function EmailVerification({
  email,
  autoSend = false,
}: {
  email: string
  /** True where this panel blocks something the customer is trying to do. */
  autoSend?: boolean
}) {
  const t = useTranslations('Settings')
  const router = useRouter()

  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''))
  const [state, setState] = useState<'idle' | 'verifying' | 'verified' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const focus = (index: number) => inputs.current[Math.min(Math.max(index, 0), LENGTH - 1)]?.focus()

  /*
   * Once per mount, and only ever once. React's strict mode runs effects twice
   * in development, and the second run would be a second email.
   */
  const asked = useRef(false)

  useEffect(() => {
    if (!autoSend || asked.current) return
    asked.current = true

    void ensureVerificationCode({}).then((outcome) => {
      if (outcome?.data?.sent) setState((current) => (current === 'idle' ? 'sent' : current))
    })
  }, [autoSend])

  async function verify(code: string) {
    setState('verifying')
    setError(null)

    const { error: failure } = await authClient.emailOtp.verifyEmail({ email, otp: code })

    if (failure) {
      /*
       * Emptied and refocused on failure. Leaving a rejected code in place
       * means the next attempt starts by clearing six boxes by hand, and the
       * commonest cause of failure is one mistyped digit in a code that is
       * otherwise correct.
       */
      setDigits(Array(LENGTH).fill(''))
      setState('idle')
      setError(
        failure.code === 'OTP_EXPIRED'
          ? t('codeExpired')
          : failure.code === 'TOO_MANY_ATTEMPTS'
            ? t('codeTooManyAttempts')
            : t('codeInvalid'),
      )
      focus(0)
      return
    }

    setState('verified')

    /*
     * The gate lives in server components — `emailVerified` arrives as a prop
     * from a server render — so the client knowing is not enough. This is the
     * refresh the customer used to have to perform themselves, except it
     * happens at the moment verification succeeds rather than whenever they
     * think to try.
     */
    router.refresh()
  }

  function write(index: number, value: string) {
    const typed = value.replace(/\D/g, '')
    if (!typed) return

    const next = [...digits]

    // One box, or a whole code pasted into one box — both arrive here, and a
    // paste should fill the row rather than a single square.
    for (let offset = 0; offset < typed.length && index + offset < LENGTH; offset++) {
      next[index + offset] = typed[offset]
    }

    setDigits(next)
    setError(null)

    const filled = next.filter(Boolean).length
    if (filled === LENGTH) void verify(next.join(''))
    else focus(index + typed.length)
  }

  function onKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const next = [...digits]

      // Backspace in an empty box steps back and clears the one before it,
      // which is what the key does in every other segmented input.
      if (next[index]) next[index] = ''
      else if (index > 0) {
        next[index - 1] = ''
        focus(index - 1)
      }

      setDigits(next)
      setError(null)
      return
    }

    if (event.key === 'ArrowLeft') { event.preventDefault(); focus(index - 1) }
    if (event.key === 'ArrowRight') { event.preventDefault(); focus(index + 1) }
  }

  async function resend() {
    setState('sending')
    setError(null)

    const { error: failure } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: 'email-verification',
    })

    setState(failure ? 'idle' : 'sent')
    if (failure) setError(t('verificationFailed'))
    else {
      setDigits(Array(LENGTH).fill(''))
      focus(0)
    }
  }

  if (state === 'verified') {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-success">
        <Check className="size-4 shrink-0" />
        {t('codeVerified')}
      </p>
    )
  }

  const busy = state === 'verifying'

  return (
    <div className="space-y-3">
      {/*
        * Always left-to-right, including in Arabic. Digits are read in that
        * order in both languages, and letting the RTL context mirror the row
        * puts the first digit typed under the last box.
        */}
      <div dir="ltr" className="flex gap-2" role="group" aria-label={t('codeLabel')}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => { inputs.current[index] = node }}
            value={digit}
            onChange={(event) => write(index, event.target.value)}
            onKeyDown={(event) => onKeyDown(index, event)}
            onFocus={(event) => event.target.select()}
            disabled={busy}
            inputMode="numeric"
            /* Lets iOS and Android offer the code straight from the SMS or
               mail notification instead of making it a memory exercise. */
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={t('codeDigit', { position: index + 1, total: LENGTH })}
            aria-invalid={error ? true : undefined}
            /* maxLength is 1 for typing, but a paste arrives whole and is
               distributed by `write` before this ever truncates it. */
            maxLength={1}
            className={cn(
              'field-lit size-11 rounded-control border border-line bg-elevated/60 text-center',
              /* 500, not 600: IBM Plex Mono is loaded at 400 and 500 only, so
                 `font-semibold` here was a browser-synthesised bold — a smeared
                 approximation of a weight the family has but we do not ship. */
              'font-mono text-base font-medium text-fg tabular-nums',
              'transition-shadow duration-200 focus:border-brand focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-danger',
            )}
          />
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* The one fact that decides whether the code in their inbox is any use.
          It was nowhere on this panel, and it is the reason most codes typed
          into it were refused. */}
      <p className="text-sm text-fg-muted">{t('codeLife', { minutes: OTP_MINUTES })}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Button variant="secondary" size="sm" onClick={resend} disabled={state === 'sending' || busy}>
          {state === 'sending' ? <Loader2 className="animate-spin" /> : <Mail />}
          {t('resendVerification')}
        </Button>

        {busy && (
          <span className="flex items-center gap-1.5 text-sm text-fg-secondary">
            <Loader2 className="size-4 animate-spin" />
            {t('codeChecking')}
          </span>
        )}

        {state === 'sent' && !busy && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <Check className="size-4" />
            {t('verificationSent')}
          </span>
        )}
      </div>
    </div>
  )
}
