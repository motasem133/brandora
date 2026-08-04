'use client'

import { Check, Loader2, Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/navigation'
import { authClient } from '@/lib/auth-client'

/**
 * A way to ask for the verification email again.
 *
 * Verification is sent once, on sign-up, and it gates the only thing the
 * product does — generating. Anyone whose link expired, went to spam, or was
 * simply never opened could not generate and had nowhere to say so: settings
 * showed an "Unverified" badge and no control beside it, and the blocked
 * generation returned an error naming a step with no button attached.
 *
 * Deliberately not disabled after a successful send. Someone who does not
 * receive the mail will press this again, and the honest response to that is
 * another email — not a greyed-out control that appears to have worked.
 */
export function ResendVerification({ email }: { email: string }) {
  const t = useTranslations('Settings')
  const router = useRouter()

  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  /*
   * Notice when the address gets verified, without being told.
   *
   * The link opens in a new tab, so the tab this is rendered in is left holding
   * a server render that said "unverified" and has no reason to ask again — the
   * button stayed disabled and the warning stayed up until someone thought to
   * reload. Verification is the one thing standing between this account and the
   * product working, so the page should be watching for it.
   *
   * The focus listener is what makes it feel immediate: returning from the tab
   * where the link was opened is exactly the moment to re-check. The interval
   * is only a fallback, for a link opened on a phone.
   *
   * This exists only while unverified — the component is rendered behind that
   * condition on every surface that uses it — so the polling stops by ceasing
   * to exist rather than by being switched off.
   */
  const refreshedAt = useRef(0)

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (cancelled || document.hidden) return

      /*
       * The cookie cache is respected deliberately, not bypassed. The server
       * render reads that same cache, so a poll that went straight to the
       * database would report "verified" while the page kept rendering
       * "blocked", and would ask for a refresh that changed nothing every time
       * it ran. Verifying in this browser refreshes the cookie anyway, which is
       * the case that matters; anything else self-heals when the cache lapses.
       */
      const { data } = await authClient.getSession()
      if (cancelled || !data?.user.emailVerified) return

      // A floor between refreshes, so a stale cache cannot turn this into a
      // request every few seconds until it expires.
      const now = Date.now()
      if (now - refreshedAt.current < 15_000) return
      refreshedAt.current = now

      router.refresh()
    }

    const onVisible = () => {
      if (!document.hidden) void check()
    }

    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(() => void check(), 10_000)

    return () => {
      cancelled = true
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [router])

  async function resend() {
    setState('sending')

    const { error } = await authClient.sendVerificationEmail({
      email,
      // Land back where the badge is, so arriving verified is self-evident.
      callbackURL: '/dashboard/settings',
    })

    setState(error ? 'failed' : 'sent')
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <Button variant="secondary" size="sm" onClick={resend} disabled={state === 'sending'}>
        {state === 'sending' ? <Loader2 className="animate-spin" /> : <Mail />}
        {t('resendVerification')}
      </Button>

      {state === 'sent' && (
        <span className="flex items-center gap-1.5 text-sm text-success">
          <Check className="size-4" />
          {t('verificationSent')}
        </span>
      )}

      {/*
       * Sign-in and mail sending are rate limited, so "try again shortly" is
       * the accurate advice far more often than any specific cause would be.
       */}
      {state === 'failed' && <span className="text-sm text-danger">{t('verificationFailed')}</span>}
    </div>
  )
}
