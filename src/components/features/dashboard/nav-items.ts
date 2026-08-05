import { CreditCard, LayoutDashboard, Settings, Shield, Sparkles } from 'lucide-react'

/**
 * The app's destinations, defined once.
 *
 * The rail and the small-screen row are two presentations of one navigation,
 * and the failure they are built to avoid is the obvious one: a destination
 * added to the rail and forgotten in the row, which is how Billing and Settings
 * came to be unreachable on a phone in the first place.
 */
export const NAV = [
  { href: '/dashboard', key: 'overview', icon: LayoutDashboard },
  { href: '/dashboard/projects', key: 'projects', icon: Sparkles },
  { href: '/dashboard/billing', key: 'billing', icon: CreditCard },
  { href: '/dashboard/settings', key: 'settings', icon: Settings },
] as const

export const ADMIN_NAV = { href: '/admin', key: 'admin', icon: Shield } as const

/**
 * Exact match for the index route, prefix match for the rest, so `/dashboard`
 * does not stay highlighted while you are on `/dashboard/projects`.
 */
export function isNavActive(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href)
}
