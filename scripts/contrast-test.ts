import { checkedSiteColors, contrast } from '../src/lib/brand-theme'

/**
 * The contrast guard, asserted against palettes designed to break it.
 *
 * A published customer site once rendered its call to action at 1.42:1 and its
 * contact email at 1.39:1, because the renderer used the generated palette raw
 * while the identical arithmetic sat unused two directories away. The defect
 * was invisible to every other suite: the HTTP tests do not read colour, the
 * browser tests run against one fixture brand whose palette happens to be fine,
 * and no generated palette in the database was hostile enough to show it.
 *
 * So the hostile palettes live here. Each case is a real failure mode — a pale
 * primary, a dark ground, ink and paper that are nearly the same colour — and
 * every colour the site puts under text has to clear the body floor on the
 * surface it is actually read on.
 *
 * Usage: pnpm test:contrast
 */

const BODY_MIN = 4.5

const PALETTES = [
  { name: 'pale primary on near-white', background: '#FFFDF7', text: '#333333', primary: '#F5D76E' },
  { name: 'dark ground, bright primary', background: '#0E1621', text: '#E6EDF5', primary: '#1F6FEB' },
  { name: 'ink and paper nearly identical', background: '#0B0B0B', text: '#111111', primary: '#222222' },
  { name: 'white on white', background: '#FFFFFF', text: '#FFFFFF', primary: '#FFFFFF' },
  { name: 'black on black', background: '#000000', text: '#000000', primary: '#000000' },
  { name: 'mid grey, no headroom either way', background: '#808080', text: '#7F7F7F', primary: '#818181' },
  { name: 'unparseable values', background: 'not-a-colour', text: '', primary: '#zzz' },
  { name: 'the shipped demo palette', background: '#FAF6F0', text: '#2D1B0E', primary: '#6F4E37' },
]

let failed = 0

for (const palette of PALETTES) {
  const safe = checkedSiteColors(palette)

  /*
   * `primary` is deliberately absent: it is a fill, and nothing is read on top
   * of it except `onPrimary`, which is checked against it rather than against
   * the paper. `line` is a hairline, not text.
   */
  const pairs: [string, number][] = [
    ['ink on paper', contrast(safe.ink, safe.paper)],
    ['muted on paper', contrast(safe.muted, safe.paper)],
    ['accent on paper', contrast(safe.accent, safe.paper)],
    ['onPrimary on primary', contrast(safe.onPrimary, safe.primary)],
  ]

  const worst = Math.min(...pairs.map(([, ratio]) => ratio))
  const ok = worst >= BODY_MIN

  if (!ok) failed++
  console.log(
    `  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${palette.name.padEnd(34)} worst ${worst.toFixed(2)}:1`,
  )
  if (!ok) {
    for (const [label, ratio] of pairs) {
      if (ratio < BODY_MIN) console.log(`      ${label}: ${ratio.toFixed(2)}:1`)
    }
  }
}

console.log(
  `\n${PALETTES.length - failed}/${PALETTES.length} palettes degrade to readable rather than to unreadable`,
)

process.exit(failed > 0 ? 1 : 0)
