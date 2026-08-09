import { PageSkeleton } from '@/components/ui/page-skeleton'

/*
 * Scoped to this page, not to the segment above it.
 *
 * A loading.tsx at `dashboard/` would wrap `projects/[id]` too, and a segment
 * that streams has already answered 200 by the time it discovers the project
 * belongs to another tenant — which is how a cross-tenant 404 became a 200
 * once before. The route groups exist so each tab can have this without
 * covering that.
 */
export default function Loading() {
  return <PageSkeleton />
}
