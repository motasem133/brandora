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
