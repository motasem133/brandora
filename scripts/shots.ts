import 'dotenv/config'

import { chromium, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/**
 * Product screenshots, taken from the demo account against a production build.
 *
 * A production build rather than `next dev`: the dev server paints its own
 * indicator badge into the corner of every page, which is in every shot and
 * cannot be cropped out of a full-page one.
 *
 * Run: pnpm shots            (needs `pnpm start --port 3100` already answering)
 */

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:3000'
const OUT = process.env.SHOTS_OUT ?? 'shots'

const EMAIL = 'motasem@brandora.app'
const PASSWORD = 'LaunchDay2026!'

/** Product Hunt's floor is 1270x760; this clears it at 2x. */
const VIEWPORT = { width: 1280, height: 800 }

const COFFEE = '83610723-8b75-48a6-abd7-3038d80101eb'

type Shot = {
  name: string
  path: string
  /** Something that must be on screen before the shutter. */
  ready?: string
  full?: boolean
  /** Shoot signed out. The marketing pages sell to someone who has no account,
      and a signed-in visit swaps their calls to action for "Go to dashboard". */
  anon?: boolean
  /** Run before shooting — open a panel, switch a tab. */
  before?: (page: Page) => Promise<void>
}

const SHOTS: Shot[] = [
  { name: '01-landing', path: '/en', full: true, anon: true },
  { name: '01b-landing-hero', path: '/en', anon: true },
  { name: '02-pricing', path: '/en/pricing', full: true, anon: true },
  { name: '03-dashboard', path: '/en/dashboard' },
  { name: '04-projects', path: '/en/dashboard/projects' },
  { name: '05-brand', path: `/en/dashboard/projects/${COFFEE}` },
  { name: '06-brand-full', path: `/en/dashboard/projects/${COFFEE}`, full: true },
  { name: '07-studio', path: '/en/dashboard/studio' },
  { name: '08-billing', path: '/en/dashboard/billing' },
  { name: '09-site', path: '/sites/weekday-roasters', full: true },
]

/**
 * Walks the page to the bottom and back.
 *
 * The marketing pages reveal their sections on scroll, so a full-page
 * screenshot of a page nobody has scrolled captures the reveals in their
 * starting state — which is invisible. Every section below the fold came out
 * blank until this ran first.
 */
async function wake(page: Page) {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.6
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 220))
    }
    window.scrollTo(0, document.body.scrollHeight)
    await new Promise((r) => setTimeout(r, 600))
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(900)
}

async function main() {
  mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 })
  const signedIn = await context.newPage()

  /* A second, never-signed-in context for the marketing pages. */
  const anonContext = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 })
  const anonPage = await anonContext.newPage()

  await signedIn.goto(`${BASE}/en/login`)
  await signedIn.getByLabel('Email').fill(EMAIL)
  await signedIn.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await signedIn.getByRole('button', { name: 'Sign in' }).click()
  await signedIn.waitForURL(/\/en\/dashboard/)
  console.log(`signed in as ${EMAIL}`)

  for (const shot of SHOTS) {
    const page = shot.anon ? anonPage : signedIn
    try {
      /*
       * Never `networkidle`: the project page holds an EventSource open for run
       * progress, so its network never goes idle and the wait always times out.
       */
      await page.goto(`${BASE}${shot.path}`, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('load')
      if (shot.ready) await page.locator(shot.ready).first().waitFor({ timeout: 15_000 })
      await shot.before?.(page)

      /* Let images decode and any entry animation settle. */
      await page.waitForTimeout(2000)
      if (shot.full) await wake(page)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(400)

      await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: shot.full ?? false })
      console.log(`  ✓ ${shot.name}`)
    } catch (error) {
      console.log(`  ✗ ${shot.name} — ${(error as Error).message.split('\n')[0]}`)
    }
  }

  await browser.close()
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
