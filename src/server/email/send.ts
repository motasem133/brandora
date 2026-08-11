import 'server-only'

import { Resend } from 'resend'

import { env } from '@/lib/env'
import { renderEmail, type EmailTemplate } from './templates'

/**
 * Transactional email.
 *
 * Delivery failures never throw. A password reset that cannot be emailed is a
 * problem, but taking down the request that triggered it turns one broken
 * outcome into two — the caller has already done its work by the time this
 * runs, and Better Auth treats a throwing handler as a failed sign-up.
 */

let client: Resend | null = null

function getClient() {
  if (!env.RESEND_API_KEY) return null
  client ??= new Resend(env.RESEND_API_KEY)
  return client
}

export function isEmailConfigured() {
  return Boolean(env.RESEND_API_KEY)
}

export async function sendEmail(params: {
  to: string
  template: EmailTemplate
  locale?: 'en' | 'ar'
  /*
   * Who a reply should go to, when that is not us.
   *
   * Only the site-message template needs it: a customer's business enquiry
   * passes through our domain, and without this the owner answers Brandora
   * instead of the person who wrote to them.
   */
  replyTo?: string
}) {
  const { subject, html } = renderEmail(params.template, params.locale ?? 'en')
  const resend = getClient()

  /*
   * Without a key the actionable part is logged instead. Development and CI
   * then behave exactly as before rather than failing, and what is printed is
   * still usable — which is the only part a developer actually needs. For a
   * code that means the code itself: it is the one thing that cannot be
   * recovered from anywhere else, because it is stored hashed.
   */
  if (!resend) {
    const secret =
      'url' in params.template
        ? params.template.url
        : 'code' in params.template
          ? params.template.code
          : ''

    console.info(`[email] ${params.template.kind} → ${params.to}\n  ${subject}\n  ${secret}`)
    return { delivered: false, reason: 'not_configured' as const }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: params.to,
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
      subject,
      html,
    })

    if (error) {
      console.error(`[email] ${params.template.kind} → ${params.to} failed:`, error.message)
      return { delivered: false, reason: 'send_failed' as const }
    }

    return { delivered: true, id: data?.id }
  } catch (error) {
    console.error(`[email] ${params.template.kind} → ${params.to} threw:`, error)
    return { delivered: false, reason: 'send_failed' as const }
  }
}
