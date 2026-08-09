import { getTranslations } from 'next-intl/server'

/**
 * The shape of a dashboard page, before the server has said what is on it.
 *
 * Every destination in this app is a dynamic route: a session, an organization
 * and a handful of queries, none of which the CDN can answer. Without a
 * boundary the router holds the previous page on screen for the whole of that
 * round trip, so a press produces nothing at all for the better part of a
 * second and the app reads as slow rather than as busy. This is that boundary's
 * fallback — and, because a dynamic route can only be prefetched as far as its
 * nearest loading state, it is also the thing that makes hovering a tab worth
 * anything.
 *
 * Deliberately generic. Five pages of hand-drawn skeletons would be five more
 * things to keep in step with the pages they stand in for, and what earns the
 * keep here is the heading landing where the heading lands.
 */
export async function PageSkeleton({ panels = 3 }: { panels?: number }) {
  const t = await getTranslations('Common')

  return (
    /*
     * Named for assistive technology, which the shimmer alone never is — and
     * under `prefers-reduced-motion` the shimmer does not run, so without this
     * the loading state is a set of silent grey boxes.
     */
    <div role="status" aria-label={t('loading')} className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <div className="shimmer-surface h-7 w-56 rounded-control bg-elevated" />
        <div className="shimmer-surface h-4 w-80 max-w-full rounded-control bg-elevated" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: panels }).map((_, index) => (
          <div
            key={index}
            className="shimmer-surface h-48 rounded-panel bg-elevated ring-1 ring-line"
          />
        ))}
      </div>
    </div>
  )
}
