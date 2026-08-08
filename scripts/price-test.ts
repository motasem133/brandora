import { formatPrice, type Currency } from '../src/lib/utils'

/**
 * The guard on how a price is written, not on what it costs.
 *
 * Every price on `/ar` painted as "$US 19". `Intl` emits "US$" for USD under
 * `ar-AE`; the "$" is bidi-neutral, so the algorithm cut it off the letters it
 * belongs to and re-seated it at the far end of the run. The number was right,
 * the currency was right, and the string was wrong. Nothing caught it: the HTTP
 * tests compare the same logical string the formatter produced, the browser
 * tests run in English, and the defect only exists once something paints.
 *
 * So what is asserted is the isolate. A first-strong isolate around the
 * currency is what makes the reordering impossible rather than unlikely (the
 * run inside it resolves on its own and cannot be split), and it is the one
 * property a future edit could silently drop. Verified against fribidi when it
 * was written: without the isolate "19 US$" paints as "$US 19", with it as
 * "US$ 19".
 *
 * English is asserted the other way round: it must carry no isolate at all. An
 * LTR page with a Latin currency mark has nothing to resolve, and two invisible
 * characters in every printed, searched and asserted price is a cost with no
 * matching defect. A system test that looked for "$19" in the page is what found
 * that out.
 *
 * The second assertion is that removing the isolates leaves exactly what `Intl`
 * would have produced. That is not circular with the first: it pins the fix to
 * being a directional hint and nothing else, so a later edit cannot quietly
 * start rewriting symbols, dropping the RTL mark, or reordering the parts.
 *
 * Deliberately not asserted: the painted order itself. Reproducing that needs a
 * real UAX#9 implementation, and a hand-rolled approximation of one is worse
 * than no test: the first draft of this file passed with the bug present.
 *
 * Usage: pnpm test:price
 */

const FSI = '⁨'
const PDI = '⁩'

/** What the formatter is wrapping: the same call, with nothing done to it. */
function raw(minor: number, currency: Currency, locale: string) {
  const hasFraction = minor % 100 !== 0

  return new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(minor / 100)
}

const CASES: {
  name: string
  minor: number
  currency: Currency
  locale: string
  symbol: string
  /** English has no direction to resolve, so it must come back untouched. */
  isolate: boolean
}[] = [
  { name: 'USD on /ar', minor: 1900, currency: 'usd', locale: 'ar', symbol: 'US$', isolate: true },
  { name: 'AED on /ar', minor: 6900, currency: 'aed', locale: 'ar', symbol: 'د.إ.', isolate: true },
  { name: 'cents kept on /ar', minor: 5499, currency: 'usd', locale: 'ar', symbol: 'US$', isolate: true },
  { name: 'free plan on /ar', minor: 0, currency: 'usd', locale: 'ar', symbol: 'US$', isolate: true },
  { name: 'USD on /en', minor: 1900, currency: 'usd', locale: 'en', symbol: '$', isolate: false },
  { name: 'AED on /en', minor: 6900, currency: 'aed', locale: 'en', symbol: 'AED', isolate: false },
  { name: 'cents kept on /en', minor: 5499, currency: 'aed', locale: 'en', symbol: 'AED', isolate: false },
]

let failed = 0

for (const { name, minor, currency, locale, symbol, isolate } of CASES) {
  const written = formatPrice(minor, currency, locale)
  const isolated = written.includes(`${FSI}${symbol}${PDI}`) === isolate
  const intact = written.replaceAll(FSI, '').replaceAll(PDI, '') === raw(minor, currency, locale)
  const ok = isolated && intact

  if (!ok) failed++
  console.log(
    `  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${name.padEnd(20)} ${JSON.stringify(written)}` +
      (ok
        ? ''
        : `   ${isolated ? 'text changed, not just isolated' : isolate ? 'currency not isolated' : 'isolated where it should not be'}`),
  )
}

console.log(`\n${CASES.length - failed}/${CASES.length} prices carry their currency as one unsplittable token`)

process.exit(failed > 0 ? 1 : 0)
