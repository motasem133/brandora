import 'dotenv/config'

import { chromium } from '@playwright/test'

/**
 * Every token a surface needs actually resolves on that surface.
 *
 * Written after a collapse stranded the whole brand ramp.
 *
 * `--brand-primary` and its ramp lived in a block that was both `:root` and
 * `.world-dark`. Splitting the two to give marketing its own dark left the ramp
 * behind with it, so `--brand-gradient` resolved to the empty string everywhere
 * else and every primary control in the product rendered as a white pill. The
 * page still returned 200, typecheck was clean, lint was clean, and seven test
 * suites passed — because a CSS custom property that resolves to nothing is not
 * an error anywhere in that stack. It is only visible in a browser, and only if
 * you look at the right element.
 *
 * So this asserts the resolved value rather than the declaration: a token that
 * exists in the file but not in the cascade is exactly the failure.
 *
 * Run: pnpm test:tokens   (needs the app answering on :3000)
 */

const BASE = process.env.TOKENS_BASE ?? 'http://localhost:3000'

type Check = {
  route: string
  /** What this route is, for the failure message. */
  world: string
  /** Custom properties that must resolve to something on the document. */
  tokens: string[]
  /** The ground it must paint, as computed `rgb(...)`. */
  ground?: string
}

const CHECKS: Check[] = [
  {
    route: '/en/login',
    world: 'the app, which has one theme and no switch',
    tokens: ['--brand-primary', '--brand-gradient', '--bg-base', '--text-primary', '--font-sans'],
    ground: 'rgb(239, 241, 244)',
  },
  {
    /* `/pricing`, not `/en`: the landing page left the dark scope on 27 August
       2026 and the other marketing pages kept it, so this is where the world
       still lives. See PRODUCT.md's brand commitments. */
    route: '/en/pricing',
    world: '.world-dark — the marketing pages that keep the pinned dark',
    tokens: ['--brand-primary', '--brand-gradient', '--bg-base', '--text-primary', '--font-sans'],
    ground: 'rgb(5, 7, 15)',
  },
  {
    route: '/ar/pricing',
    world: 'the dark scope under RTL, where the Arabic face takes both roles',
    tokens: ['--brand-gradient', '--font-display', '--font-sans'],
  },
]

async function main() {
  const browser = await chromium.launch()
  const failures: string[] = []

  for (const check of CHECKS) {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE}${check.route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)

    const seen = await page.evaluate((tokens: string[]) => {
      const style = getComputedStyle(document.documentElement)
      const out: Record<string, string> = {}
      for (const token of tokens) out[token] = style.getPropertyValue(token).trim()
      return { tokens: out, ground: getComputedStyle(document.body).backgroundColor }
    }, check.tokens)

    for (const [token, value] of Object.entries(seen.tokens)) {
      if (!value) failures.push(`${check.route} (${check.world}): ${token} resolves to nothing`)
    }

    /*
     * The ground is checked on `body` rather than on the root, because that is
     * where the bug lived: a world declared on a div paints itself while the
     * document keeps painting from its own tokens.
     */
    if (check.ground && seen.ground !== check.ground) {
      failures.push(`${check.route} (${check.world}): ground is ${seen.ground}, expected ${check.ground}`)
    }

    await context.close()
  }

  await browser.close()

  if (failures.length) {
    console.error(`✗ ${failures.length} failed:`)
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exitCode = 1
    return
  }

  const count = CHECKS.reduce((total, check) => total + check.tokens.length, 0)
  console.log(`✓ ${count} tokens resolve across ${CHECKS.length} worlds, and each paints its own ground`)
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
