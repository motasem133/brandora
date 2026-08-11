'use client'

import * as React from 'react'

import type { CheckedSiteColors } from '@/lib/brand-theme'

/**
 * The form that makes a published site able to take a message.
 *
 * The contact block printed an address and a phone number as text. For the
 * business this product is sold to — someone getting their first website — a
 * site that cannot be written to is half a site, and it is the half they are
 * judged on.
 *
 * It posts to its own address. The page was served through a rewrite from the
 * customer's own host, so a relative `contact` lands back on the same site
 * without this component ever knowing what domain it is on, or that Brandora
 * exists.
 *
 * Sized in utilities and coloured inline, which is the rule the rest of this
 * renderer follows: spacing and type come from the design system, and only the
 * values that cannot be known at build time — the customer's own palette and
 * typeface — are set as inline styles.
 */
/**
 * Where to post, which depends on how the site was reached.
 *
 * A published site has two real addresses. On the customer's own host it is
 * served at `/`, and the proxy rewrites every path onto `/sites/{host}/…` — so
 * the form posts to `/contact`. Inside the app it is reached at
 * `/sites/{subdomain}`, where the proxy does no such rewrite and the route sits
 * at `/sites/{subdomain}/contact`.
 *
 * A relative `contact` looked right and worked on exactly one of those: from
 * `/sites/desert-bloom` it resolves to `/sites/contact`, which is a 404. The
 * pathname is the only thing that knows which world this page is in, so it is
 * what decides.
 */
function endpoint() {
  const segments = window.location.pathname.split('/').filter(Boolean)
  return segments[0] === 'sites' && segments[1]
    ? `/sites/${segments[1]}/contact`
    : '/contact'
}

export function ContactForm({
  colors,
  labels,
  font,
}: {
  colors: CheckedSiteColors
  /** Supplied by the server so the site's own language governs, not the app's. */
  labels: {
    name: string
    email: string
    message: string
    send: string
    sending: string
    sent: string
    failed: string
  }
  font: string
}) {
  const [state, setState] = React.useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'sending') return

    const form = new FormData(event.currentTarget)
    setState('sending')

    try {
      const response = await fetch(endpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(form.get('name') ?? ''),
          email: String(form.get('email') ?? ''),
          message: String(form.get('message') ?? ''),
        }),
      })

      setState(response.ok ? 'sent' : 'failed')
    } catch {
      setState('failed')
    }
  }

  /*
   * Sent is an end state, not a message above an empty form.
   *
   * Leaving the fields there invites a second send from somebody who cannot
   * tell whether the first one worked — which is how a business gets the same
   * enquiry three times and the visitor gets no more certainty than before.
   */
  if (state === 'sent') {
    return (
      <p className="mt-8 text-lg" style={{ color: colors.ink, fontFamily: font }}>
        {labels.sent}
      </p>
    )
  }

  const field = 'w-full rounded-lg border px-4 py-3 text-base'
  const fieldStyle = {
    borderColor: colors.line,
    background: colors.paper,
    color: colors.ink,
    fontFamily: font,
  }
  const labelStyle = { color: colors.muted, fontFamily: font }

  return (
    <form onSubmit={submit} className="mx-auto mt-8 grid max-w-lg gap-3 text-start">
      <label className="grid gap-1.5">
        <span className="text-sm" style={labelStyle}>
          {labels.name}
        </span>
        <input name="name" required maxLength={100} className={field} style={fieldStyle} />
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm" style={labelStyle}>
          {labels.email}
        </span>
        <input
          name="email"
          type="email"
          required
          maxLength={200}
          className={field}
          style={fieldStyle}
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm" style={labelStyle}>
          {labels.message}
        </span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          className={`${field} resize-y`}
          style={fieldStyle}
        />
      </label>

      <button
        type="submit"
        disabled={state === 'sending'}
        className="mt-1 justify-self-start rounded-full px-6 py-3 text-base font-semibold disabled:opacity-70"
        style={{ background: colors.primary, color: colors.onPrimary, fontFamily: font }}
      >
        {state === 'sending' ? labels.sending : labels.send}
      </button>

      {/* Kept in the flow rather than replacing the form: whatever they typed
          is still there to send again. */}
      {state === 'failed' && (
        <p role="alert" className="text-sm" style={{ color: colors.ink, fontFamily: font }}>
          {labels.failed}
        </p>
      )}
    </form>
  )
}
