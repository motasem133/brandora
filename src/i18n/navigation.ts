import { createNavigation } from 'next-intl/navigation'
import type { ComponentProps } from 'react'

import { routing } from './routing'

/**
 * Locale-aware navigation primitives. Always import Link/redirect/useRouter
 * from here rather than from `next/link` or `next/navigation`, or the locale
 * prefix is lost on navigation.
 */
const navigation = createNavigation(routing)

export const { redirect, usePathname, useRouter, getPathname } = navigation

/**
 * next-intl's Link, plus the one next/link prop its types leave out.
 *
 * `unstable_dynamicOnHover` upgrades the prefetch to the full dynamic payload
 * on hover or touchstart — which is the only prefetch worth anything on this
 * app's routes, since all of them are dynamic and their static shell is empty.
 * next-intl spreads every prop it does not recognise straight onto next/link,
 * so this works at runtime; it is only the prop type that stops at the wrapper.
 */
export const Link = navigation.Link as React.FC<
  ComponentProps<typeof navigation.Link> & { unstable_dynamicOnHover?: boolean }
>
