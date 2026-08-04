'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { ArrowUp, Check, Loader2, Sparkles, Wrench } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const SUGGESTIONS = ['warmerPalette', 'shorterSlogan', 'punchierStory', 'arabicFonts'] as const

export function AssistantPanel({
  projectId,
  initialMessages,
}: {
  projectId: string
  initialMessages: UIMessage[]
}) {
  const t = useTranslations('Assistant')
  const router = useRouter()

  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const appliedRef = useRef(0)
  const draftKey = `brandora:assistant-draft:${projectId}`

  const { messages, sendMessage, status, error } = useChat({
    // Seeded from the database, so leaving the tab and coming back resumes the
    // conversation rather than starting a new one.
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/assistant',
      body: { projectId },
    }),
  })

  const busy = status === 'submitted' || status === 'streaming'

  /*
   * Scroll the transcript, never the page.
   *
   * `scrollIntoView` walks up and scrolls every scrollable ancestor, the
   * document included — so mounting this panel anywhere other than alone on a
   * route yanked the whole page down to it and the content above was never
   * seen. Setting `scrollTop` on the transcript moves only the transcript.
   */
  useEffect(() => {
    const list = listRef.current
    if (!list) return

    list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
  }, [messages])

  /*
   * Restore anything typed but not sent before navigating away — losing a
   * half-written request to a tab click is small and feels terrible.
   *
   * The textarea is uncontrolled and restored by writing to the DOM node. Held
   * in React state it would either need setState inside an effect, which costs
   * a cascading render, or a lazy initialiser that reads sessionStorage during
   * SSR where it does not exist.
   */
  useEffect(() => {
    const field = inputRef.current
    if (!field) return
    const saved = sessionStorage.getItem(draftKey)
    if (saved) field.value = saved
  }, [draftKey])

  /*
   * Tool calls mutate the brand in the database, so the surrounding
   * server-rendered views are stale the moment one succeeds. Refresh when the
   * number of completed tool calls grows, rather than on every token.
   */
  useEffect(() => {
    if (busy) return

    const applied = messages.reduce(
      (total, message) =>
        total + (message.parts ?? []).filter((part) => part.type.startsWith('tool-')).length,
      0,
    )

    if (applied > appliedRef.current) {
      appliedRef.current = applied
      router.refresh()
    }
  }, [messages, busy, router])

  function saveDraft(value: string) {
    try {
      if (value) sessionStorage.setItem(draftKey, value)
      else sessionStorage.removeItem(draftKey)
    } catch {
      // Private browsing with storage disabled — the draft simply is not kept.
    }
  }

  function submit(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return

    sendMessage({ text: trimmed })

    if (inputRef.current) inputRef.current.value = ''
    saveDraft('')
  }

  return (
    <Card className="flex h-[36rem] flex-col p-0">
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-brand/15 p-3">
              <Sparkles className="size-5 text-brand" />
            </div>
            <div>
              <p className="font-display font-semibold">{t('emptyTitle')}</p>
              <p className="mt-1 text-sm text-fg-secondary">{t('emptyBody')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((key) => (
                <button
                  key={key}
                  onClick={() => submit(t(`suggestions.${key}`))}
                  className="rounded-full border border-line px-3 py-1.5 text-xs text-fg-secondary transition-colors hover:border-brand hover:text-fg"
                >
                  {t(`suggestions.${key}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            {(message.parts ?? []).map((part, index) => {
              if (part.type === 'text') {
                return (
                  <div
                    key={index}
                    className={cn(
                      'max-w-[85%] whitespace-pre-line rounded-xl px-4 py-2.5 text-sm leading-relaxed',
                      message.role === 'user'
                        ? 'ms-auto bg-brand text-brand-fg'
                        : 'bg-elevated text-fg',
                    )}
                  >
                    {part.text}
                  </div>
                )
              }

              // Tool parts render as a receipt of what was actually changed.
              if (part.type.startsWith('tool-')) {
                const output = (part as { output?: { ok?: boolean; summary?: string; reason?: string } })
                  .output
                const done = output !== undefined

                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg border border-line bg-elevated/40 px-3 py-2 text-xs"
                  >
                    {done ? (
                      <Check className={cn('size-3.5', output?.ok ? 'text-success' : 'text-danger')} />
                    ) : (
                      <Wrench className="size-3.5 animate-pulse text-fg-muted" />
                    )}
                    <span className="text-fg-secondary">
                      {output?.summary ?? output?.reason ?? t('applying')}
                    </span>
                  </div>
                )
              }

              return null
            })}
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            <Loader2 className="size-3.5 animate-spin" />
            {t('thinking')}
          </div>
        )}

        {error && <p className="text-sm text-danger">{t('error')}</p>}

      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit(inputRef.current?.value ?? '')
        }}
        className="flex items-end gap-2 border-t border-line p-3"
      >
        <textarea
          ref={inputRef}
          onChange={(event) => saveDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends, Shift+Enter breaks the line — the convention every
            // chat UI has trained people to expect.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit(event.currentTarget.value)
            }
          }}
          rows={1}
          placeholder={t('placeholder')}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-line bg-surface px-3.5 py-3 text-sm focus:border-brand focus:outline-none"
        />
        <Button type="submit" size="icon" disabled={busy} aria-label={t('send')}>
          {busy ? <Loader2 className="animate-spin" /> : <ArrowUp />}
        </Button>
      </form>
    </Card>
  )
}
