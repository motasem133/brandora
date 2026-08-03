'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'

import { POSTHOG_HOST, POSTHOG_KEY, isAnalyticsConfigured } from '@/lib/analytics'

/**
 * Initialises PostHog once, in the browser.
 *
 * Mounted from the locale layout so marketing pages are measured too — the
 * question worth answering is how many visitors reach sign-up, and that is
 * unanswerable if counting starts after they already have.
 */
export function PostHogProvider() {
  useEffect(() => {
    if (!isAnalyticsConfigured() || posthog.__loaded) return

    posthog.init(POSTHOG_KEY!, {
      /*
       * Requests go to our own origin and are rewritten onward in
       * next.config.ts. Sent to posthog.com directly, ad blockers drop them,
       * and the visitors most likely to be blocked are exactly the technical
       * audience whose behaviour is worth knowing.
       */
      api_host: '/ingest',
      ui_host: POSTHOG_HOST,

      // See lib/analytics: this app's screens are full of unreleased customer
      // work, and neither of these can be aimed narrowly enough to be safe.
      autocapture: false,
      disable_session_recording: true,

      // Navigations are client-side, so the History API is what marks a view.
      capture_pageview: 'history_change',
      capture_pageleave: true,

      // Anonymous visitors still produce events; they just do not each get a
      // stored person profile until they identify by signing in.
      person_profiles: 'identified_only',
    })
  }, [])

  return null
}

/**
 * Ties events to the signed-in user and their organization.
 *
 * The id is the only identifier sent. Names and email addresses stay out — the
 * dashboard already shows them to the people who need them, and an analytics
 * warehouse is not where a customer list should accumulate.
 */
export function AnalyticsIdentity({
  userId,
  organizationId,
  plan,
}: {
  userId: string
  organizationId: string
  plan: string
}) {
  useEffect(() => {
    if (!isAnalyticsConfigured()) return

    posthog.identify(userId)
    // Groups make "which plans actually generate" answerable per organization
    // rather than per person, which is the unit that pays.
    posthog.group('organization', organizationId, { plan })

    /*
     * No reset on unmount. This component unmounts on every navigation out of
     * the dashboard, and resetting there would split one person's session into
     * a new anonymous identity each time they visited a marketing page. The
     * reset belongs to signing out, and lives with the sign-out button.
     */
  }, [userId, organizationId, plan])

  return null
}
