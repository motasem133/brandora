import { setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { Sidebar } from '@/components/features/dashboard/sidebar'
import { Topbar } from '@/components/features/dashboard/topbar'
import { getSession } from '@/server/session'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  // Middleware already redirected unauthenticated users, but middleware only
  // checks for a cookie's presence. This is the actual enforcement.
  const session = await getSession()
  if (!session) redirect(`/${locale}/login`)

  return (
    <div className="flex min-h-dvh">
      <Sidebar isAdmin={session.user.role === 'admin'} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={{ name: session.user.name, email: session.user.email }} />
        <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  )
}
