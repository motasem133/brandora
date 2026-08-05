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
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(60rem_20rem_at_50%_-6rem,color-mix(in_srgb,var(--brand-primary)_16%,transparent),transparent_70%)]"
      />

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
