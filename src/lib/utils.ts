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

export const CURRENCIES = ['usd', 'aed'] as const
export type Currency = (typeof CURRENCIES)[number]

export function isCurrency(value: unknown): value is Currency {
  return value === 'usd' || value === 'aed'
}

export type BillingInterval = 'monthly' | 'yearly'

export function isInterval(value: unknown): value is BillingInterval {
  return value === 'monthly' || value === 'yearly'
}

/**
 * Currency and interval both live in the URL, so every link that changes one
 * has to carry the other — otherwise picking "yearly" silently resets a
 * customer's currency back to the locale default.
 */
export function billingHref(
  base: string,
  params: { currency: Currency; interval: BillingInterval },
) {
  return `${base}?currency=${params.currency}&interval=${params.interval}`
}

/**
 * What a year up front saves against paying monthly, as a whole percentage.
 *
 * Derived from the prices themselves rather than stated in copy, so a plan
 * whose annual price is edited can never advertise a discount it does not give.
 * Returns null when there is nothing to claim.
 */
export function yearlySavingPercent(priceMonthly: number, priceYearly: number): number | null {
  if (priceMonthly <= 0 || priceYearly <= 0) return null

  const full = priceMonthly * 12
  if (priceYearly >= full) return null

  return Math.round(((full - priceYearly) / full) * 100)
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
