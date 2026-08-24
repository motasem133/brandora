'use client'

import { Loader2, MailWarning, Send } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useLayoutEffect, useRef, useState } from 'react'

import { FieldError } from '@/components/ui/field-error'
import { EmailVerification } from '@/components/features/settings/email-verification'
import { Link, useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { EVENTS, capture } from '@/lib/analytics'
import { regenerateLogos } from '@/server/actions/generation'

/**
 * The prompt bar under the canvas: say what to change, send, a round starts.
 *
 * It was a bordered panel with a heading, two lines of explanation, a labelled
 * textarea and a wide button — five elements to say one thing. As a composer it
 * says the same thing in a placeholder and a send key, and it sits where the
 * next action belongs, directly beneath the work it changes.
 *
 * (The two-button version this originally replaced — "save direction" then
 * "regenerate" — spent credits on a run that ignored what had just been typed.
 * One control, one meaning.)
 */
export function LogoComposer({
  projectId,
  brief,
  cost,
  affordable,
  creditBalance,
  isRunning,
  mustVerify,
  userEmail,
}: {
  projectId: string
  brief: string | null
  cost: number
  affordable: boolean
  /** Shown beside the cost, because "can I afford this?" is asked here. */
  creditBalance: number
  isRunning: boolean
  /** A new round is a generation, so the same gate applies here. */
  mustVerify: boolean
  userEmail: string
}) {
  const t = useTranslations('Branding')
  const ts = useTranslations('Settings')
  const router = useRouter()

  // Seeded with the last direction, so refining it means editing a sentence
  // rather than remembering what was asked for last time.
  const [text, setText] = useState(brief ?? '')
  const [queued, setQueued] = useState(false)

  const field = useRef<HTMLTextAreaElement>(null)

  /*
   * Grow to fit what has been written.
   *
   * A fixed two-row box meant a long direction — which is the useful kind, the
   * one that says what to keep as well as what to change — scrolled away inside
   * a slot barely taller than the send button, and could not be read back
   * before sending it.
   *
   * Height is reset to `auto` before measuring so the box shrinks again on
   * delete; `scrollHeight` alone only ever reports the taller of content and
   * current height. Past the max the CSS caps it and the field scrolls, which
   * is the point at which one more line stops helping anyway.
   *
   * A layout effect rather than an event handler: the field is seeded with the
   * previous round's brief, so it has to be sized before the first paint too,
   * not only after a keystroke.
   */
  useLayoutEffect(() => {
    const element = field.current
    if (!element) return

    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [text])

  const { execute, isPending, result } = useAction(regenerateLogos, {
    onSuccess: () => {
      /*
       * Queueing returns long before anything visible changes. Holding this
       * locally keeps the control showing progress from the moment it is
       * pressed, which is what stopped people pressing it twice.
       */
      capture(EVENTS.logosRegenerated, { cost })
      setQueued(true)

      /*
       * Unpin the round before the new one arrives.
       *
       * Choosing a concept puts `round` and `concept` in the URL, and the page
       * resolves the canvas from them. So the moment anyone picked a logo and
       * then asked for a new direction, the round they had been looking at was
       * pinned: the job ran, the stream fired its refresh, and the page
       * re-rendered on the old round with the new concepts nowhere on screen.
       * It looked like the generation had done nothing.
       *
       * Asking for a new direction is the end of browsing an old round, so the
       * pin is dropped here rather than guessed at on the way back in.
       */
      router.replace(`/dashboard/projects/${projectId}`, { scroll: false })
      router.refresh()
    },
    onError: () => setQueued(false),
  })

  const busy = isPending || queued || isRunning
  const disabled = busy || !affordable || mustVerify

  function send() {
    if (disabled) return
    execute({ projectId, brief: text })
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-end gap-2 rounded-card border border-line bg-surface p-2 transition-colors',
          'focus-within:border-brand/60',
          busy && 'opacity-70',
        )}
      >
        <label htmlFor="logo-direction" className="sr-only">
          {t('directionTitle')}
        </label>

        <textarea
          ref={field}
          id="logo-direction"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            /*
             * Cmd/Ctrl+Enter sends. A bare Enter does not.
             *
             * This is a chat box everywhere except in what it costs: one press
             * spends six credits of real money and starts a job that cannot be
             * undone. The field is also seeded with the previous round's brief,
             * so it is never empty on arrival — tabbing in and pressing Enter
             * out of habit was enough to spend them. Every other composer in
             * the world is free to send; this one has to ask for the modifier.
             */
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              send()
            }
          }}
          disabled={busy || mustVerify}
          placeholder={t('directionPlaceholder')}
          /*
           * `text-base` against the app's `text-sm` fields, deliberately. This
           * is the one place in the product where someone writes a sentence
           * rather than fills a slot, and it is read back before it is spent on
           * a paid round. It also keeps iOS from zooming the page on focus,
           * which it does to any input under 16px.
           *
           * The floor holds two lines so the example placeholder still reads on
           * an empty composer; the ceiling is where it starts scrolling.
           */
          className="max-h-48 min-h-16 w-full resize-none overflow-y-auto bg-transparent px-2.5 py-2 text-base leading-normal placeholder:text-fg-muted focus:outline-none disabled:cursor-not-allowed"
        />

        <button
          onClick={send}
          disabled={disabled}
          title={t('sendDirection', { credits: cost })}
          /*
           * The label carries the state, because the icon cannot. A send
           * control that silently becomes a spinner tells a screen reader
           * nothing about whether the press did anything.
           */
          aria-label={busy ? t('regenerating') : t('sendDirection', { credits: cost })}
          className="grid size-10 shrink-0 place-items-center rounded-control bg-[image:var(--brand-gradient)] text-brand-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4 rtl:-scale-x-100" />
          )}
        </button>
      </div>

      {/*
        The same gate the generation panel shows, said here too.

        The panel disappears once a project is complete, and refining logos is
        exactly what someone does with a complete project — so this was the one
        route to generation that still let you write a direction, press send,
        and receive a bare "verify your email" with nothing to press.
      */}
      {!mustVerify ? (
        <p className="px-1 text-xs text-fg-muted">
          {busy ? (
            t('regenerating')
          ) : affordable ? (
            t('composerHint', { credits: cost, balance: creditBalance })
          ) : (
            /*
             * Was a `title` on the disabled button: invisible on touch,
             * unreliable in assistive tech, and the one message a customer
             * most needs when the control stops responding.
             */
            <span className="text-warning">
              {t('notEnoughCreditsHint', { credits: cost, balance: creditBalance })}{' '}
              <Link href="/dashboard/billing" className="underline underline-offset-2">
                {t('topUp')}
              </Link>
            </span>
          )}
        </p>
      ) : (
        <div className="rounded-control border border-warning/30 bg-warning/[0.07] p-4">
          <div className="flex items-start gap-3">
            <MailWarning className="mt-0.5 size-4 shrink-0 text-warning" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{ts('unverifiedTitle')}</p>
              <p className="mt-1 text-sm text-fg-secondary">
                {ts('unverifiedBody', { email: userEmail })}
              </p>
              <div className="mt-3.5">
                {/* Blocking, so it sends a code if none is live — see the panel. */}
                <EmailVerification email={userEmail} autoSend />
              </div>
            </div>
          </div>
        </div>
      )}

      <FieldError message={result?.serverError} />
    </div>
  )
}
