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
 *
 * They come in pairs on purpose. Every start already recorded here had no
 * finish, so nothing could be asked about drop-off: the wizard was one black
 * box between "started" and "project created", checkout recorded the press and
 * not the payment, and running out of credits — the moment a free customer
 * either pays or leaves — fired nothing at all.
 */
export const EVENTS = {
  onboardingStep: 'onboarding_step',
  projectCreated: 'project_created',
  generationStarted: 'generation_started',
  generationFinished: 'generation_finished',
  logosRegenerated: 'logos_regenerated',
  contentGenerated: 'content_generated',
  websitePublished: 'website_published',
  customDomainAttached: 'custom_domain_attached',
  checkoutStarted: 'checkout_started',
  checkoutCompleted: 'checkout_completed',
  creditsExhausted: 'credits_exhausted',
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
