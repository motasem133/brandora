import posthog from 'posthog-js'

/**
 * Product analytics.
 *
 * Deliberately narrow: page views, a named set of product events, and who did
 * them. Autocapture and session recording are both off — this app's screens are
 * full of the customer's unreleased brand work, business names, briefs, colour
 * choices, and neither feature can be pointed at a page without hoovering some
 * of that up. What is measured here is chosen on purpose.
 *
 * Without a key every call is inert, exactly as with Sentry.
 *
 * Page views carry the document title, which is safe only while titles stay
 * static ("Billing · Brandora"). A page that titles itself after the customer's
 * business would put that name in every pageview — add it to a
 * `property_denylist` before writing such a title.
 */

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST

export function isAnalyticsConfigured() {
  return Boolean(POSTHOG_KEY)
}

/**
 * The events worth asking questions about later.
 *
 * A closed set rather than free strings: a typo in an event name is invisible
 * until someone builds a funnel on it and finds half the data missing.
 */
export const EVENTS = {
  projectCreated: 'project_created',
  generationStarted: 'generation_started',
  logosRegenerated: 'logos_regenerated',
  websitePublished: 'website_published',
  customDomainAttached: 'custom_domain_attached',
  checkoutStarted: 'checkout_started',
} as const

export type AnalyticsEvent = (typeof EVENTS)[keyof typeof EVENTS]

/**
 * Records an event. Properties must describe the action, never its content —
 * "which plan" and "which interval", not the brand brief that was typed.
 */
export function capture(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>) {
  if (!isAnalyticsConfigured()) return
  posthog.capture(event, properties)
}

/** Called on sign-out, so the next person on this browser starts as themselves. */
export function resetAnalyticsIdentity() {
  if (!isAnalyticsConfigured()) return
  posthog.reset()
}
