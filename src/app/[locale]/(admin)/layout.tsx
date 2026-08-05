import { setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { AdminNav } from '@/components/features/admin/admin-nav'
import { getSession } from '@/server/session'

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

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
      <AdminNav />
      <main id="content" tabIndex={-1} className="mt-6">
        {children}
      </main>
    </div>
  )
}
