import { setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { AdminNav } from '@/components/features/admin/admin-nav'
import { AppNav } from '@/components/features/dashboard/app-nav'
import { getSession, requireOrg } from '@/server/session'

/**
 * Administration shell.
 *
 * The proxy redirects non-admins away from /admin, but that only reads a cookie
 * without verifying it. This is the check that actually decides.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getSession()
  if (!session) redirect(`/${locale}/login`)
  if (session.user.role !== 'admin') redirect(`/${locale}/dashboard`)

  const { org } = await requireOrg()

  /*
   * Administration keeps the product's own shell.
   *
   * It used to drop it entirely — no navigation, no identity, no way back
   * except a text link an admin had to notice — which made /admin feel like a
   * different application bolted to the side of this one. It is a destination
   * in the same navigation as the rest, so it wears the same bar.
   */
  /*
   * Administration is entirely desk, so the board goes on the layout rather
   * than on five pages — and the shell comes with it. That is why /admin has no
   * seam where billing still does: nothing under here shows generated work, so
   * there is nothing left on the old world to butt against.
   *
   * The radial wash that used to sit behind the bar is gone with it. It drew the
   * Darkroom's horizon — a light source below the fold, rising — and a board in
   * daylight has no horizon to rise from.
   */
  return (
    <div className="world-board relative flex min-h-dvh flex-col">
      <AppNav
        user={{ name: session.user.name, email: session.user.email }}
        isAdmin
        credits={org.creditBalance}
      />

      <main
        id="content"
        tabIndex={-1}
        className="animate-fade-up mx-auto w-full max-w-[90rem] flex-1 px-6 py-10 lg:px-10"
      >
        <AdminNav />
        <div className="mt-8">{children}</div>
      </main>
    </div>
  )
}
