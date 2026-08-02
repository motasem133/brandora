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

/** Money is stored as integer cents everywhere. */
export function formatPrice(cents: number, locale = 'en') {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}
