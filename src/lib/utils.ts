import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge conditional class names, with later Tailwind utilities winning. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, locale = 'en') {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

const RELATIVE_STEPS = [
  { unit: 'second' as const, ms: 1000, limit: 60 },
  { unit: 'minute' as const, ms: 60_000, limit: 60 },
  { unit: 'hour' as const, ms: 3_600_000, limit: 24 },
  { unit: 'day' as const, ms: 86_400_000, limit: 7 },
]

/**
 * "4 minutes ago" for a history that is mostly minutes old.
 *
 * Rendered on the server, so it is a snapshot rather than a ticking clock —
 * which is right for a list of past rounds and wrong for anything live.
 * Anything older than a week falls back to a date, because "37 days ago" is a
 * worse answer than "3 Aug 2026".
 */
export function formatRelative(date: Date | string, locale = 'en') {
  const then = new Date(date)
  const elapsed = Date.now() - then.getTime()
  const tag = locale === 'ar' ? 'ar-AE' : 'en-GB'

  if (elapsed >= 7 * 86_400_000) return formatDate(then, locale)

  const format = new Intl.RelativeTimeFormat(tag, { numeric: 'auto' })
  const step = RELATIVE_STEPS.find(({ ms, limit }) => elapsed < ms * limit) ?? RELATIVE_STEPS[3]

  return format.format(-Math.floor(elapsed / step.ms), step.unit)
}

export const CURRENCIES = ['usd', 'aed'] as const
export type Currency = (typeof CURRENCIES)[number]

export function isCurrency(value: unknown): value is Currency {
  return value === 'usd' || value === 'aed'
}

/**
 * Which period a subscription is billed on.
 *
 * Only `monthly` is sold. The type keeps both because the column does: a row
 * written while annual existed is still readable, and the display honours it.
 */
export type BillingInterval = 'monthly' | 'yearly'

/** The currency choice lives in the URL, so prices stay server-rendered. */
export function billingHref(base: string, params: { currency: Currency }) {
  return `${base}?currency=${params.currency}`
}

/**
 * Money is stored as integer minor units in each currency it is sold in.
 *
 * Fraction digits are dropped only for whole amounts, so $29 stays "$29" while
 * AED 54.99 keeps its cents rather than rounding to a price nobody is charged.
 */
export function formatPrice(minorUnits: number, currency: Currency = 'usd', locale = 'en') {
  const hasFraction = minorUnits % 100 !== 0

  return new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(minorUnits / 100)
}

/**
 * Chooses which currency to display an item in.
 *
 * A product may be priced in only one currency — Polar allows that, and a
 * missing price reads as 0. Showing "AED 0" for a paid plan would advertise it
 * as free, so the display falls back to whichever currency actually has a
 * price, and reports which one it used.
 */
export function pickPrice(
  preferred: Currency,
  prices: { usd: number; aed: number },
): { amount: number; currency: Currency; alternate: { amount: number; currency: Currency } | null } {
  const other: Currency = preferred === 'usd' ? 'aed' : 'usd'
  const preferredAmount = prices[preferred]
  const otherAmount = prices[other]

  // Free products legitimately cost zero in every currency.
  const isFree = prices.usd === 0 && prices.aed === 0
  const usePreferred = isFree || preferredAmount > 0

  const currency = usePreferred ? preferred : other
  const amount = usePreferred ? preferredAmount : otherAmount
  const alternateAmount = usePreferred ? otherAmount : preferredAmount
  const alternateCurrency: Currency = usePreferred ? other : preferred

  return {
    amount,
    currency,
    alternate: alternateAmount > 0 ? { amount: alternateAmount, currency: alternateCurrency } : null,
  }
}
