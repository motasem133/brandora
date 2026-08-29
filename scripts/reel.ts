import 'dotenv/config'

import { chromium, type Page } from '@playwright/test'
import { sql } from 'drizzle-orm'
import { mkdirSync } from 'node:fs'

import { db } from '../src/server/db'

/**
 * Vertical frames for a reel: the brief going in, the run working, the brand
 * coming out.
 *
 * 432x768 at deviceScaleFactor 2.5 is exactly 1080x1920, and 432 CSS pixels is
 * a phone width — so these are the mobile layout, which is what a vertical
 * video should be showing anyway.
 *
 * Run: pnpm reel     (needs the app answering on :3000)
 */

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:3000'
const OUT = process.env.SHOTS_OUT ?? 'reel'

const COFFEE = '83610723-8b75-48a6-abd7-3038d80101eb'

const EMAIL = 'motasem@brandora.app'
const PASSWORD = 'LaunchDay2026!'

const VIEWPORT = { width: 432, height: 768 }
const SCALE = 2.5

let n = 0
async function frame(page: Page, name: string) {
  await page.waitForTimeout(700)
  const label = String(++n).padStart(2, '0')
  await page.screenshot({ path: `${OUT}/${label}-${name}.png` })
  console.log(`  ✓ ${label}-${name}`)
}

/**
 * Puts an element at the top of the frame, clear of the header.
 *
 * `scrollIntoViewIfNeeded` is the wrong tool: it does the least it can, so an
 * element already partly visible does not move at all and one below the fold
 * lands at the *bottom* of the viewport with the rest of the section still off
 * screen. Both produced frames of the wrong thing. Aligning to the top and then
 * backing off clears the sticky glass bar, which otherwise sits over whatever
 * arrives at y=0.
 */
const HEADER = 150

async function anchor(page: Page, target: ReturnType<Page['locator']>) {
  await target.evaluate((el) => el.scrollIntoView({ block: 'start' }))
  await page.evaluate((h) => window.scrollBy(0, -h), HEADER)
  await page.waitForTimeout(500)
}

async function section(page: Page, heading: string, name: string) {
  await anchor(page, page.getByText(heading, { exact: false }).first())
  await frame(page, name)
}

/**
 * The run, staged rather than paid for.
 *
 * The progress panel is the frame this reel is actually about, and it only
 * exists while a job is in flight. Running one for real costs credits on the
 * owner's keys and needs the Inngest dev server up, so instead the finished
 * project is put back into each mid-run state for exactly as long as it takes
 * to photograph it. Restored in a `finally` — leaving a completed brand marked
 * `generating` would hide it behind a progress bar that never finishes.
 */
const SECTIONS = ['branding', 'logos', 'website', 'social']

const STAGES: Array<{ name: string; done: string[]; running: string }> = [
  { name: 'run-branding', done: [], running: 'branding' },
  { name: 'run-logos', done: ['branding'], running: 'logos' },
  { name: 'run-website', done: ['branding', 'logos'], running: 'website' },
  { name: 'run-social', done: ['branding', 'logos', 'website'], running: 'social' },
]

function progressFor(stage: { done: string[]; running: string }) {
  const out: Record<string, { status: string }> = {}
  for (const section of SECTIONS) {
    out[section] = {
      status: stage.done.includes(section)
        ? 'done'
        : section === stage.running
          ? 'running'
          : 'pending',
    }
  }
  return out
}

async function shootTheRun(page: Page) {
  const [before] = await db.execute<{ status: string }>(
    sql`SELECT status FROM projects WHERE id = ${COFFEE}`,
  )

  const [job] = await db.execute<{ id: string }>(sql`
    INSERT INTO generation_jobs (project_id, trigger, sections, progress, status, created_at)
    VALUES (${COFFEE}, 'initial', ${JSON.stringify(SECTIONS)}::jsonb, '{}'::jsonb, 'running', now())
    RETURNING id
  `)

  try {
    await db.execute(sql`UPDATE projects SET status = 'generating' WHERE id = ${COFFEE}`)

    for (const stage of STAGES) {
      await db.execute(sql`
        UPDATE generation_jobs SET progress = ${JSON.stringify(progressFor(stage))}::jsonb
        WHERE id = ${job.id}
      `)
      await page.goto(`${BASE}/en/dashboard/projects/${COFFEE}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForTimeout(2200)
      /* The panel is below the identity card on a phone, so the shot has to
         be taken at it rather than at the top of the page. */
      await anchor(page, page.getByText('Generating your brand').first())
      await frame(page, stage.name)
    }
  } finally {
    await db.execute(sql`DELETE FROM generation_jobs WHERE id = ${job.id}`)
    await db.execute(sql`UPDATE projects SET status = ${before.status} WHERE id = ${COFFEE}`)
    console.log(`  · project restored to ${before.status}`)
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE })
  const page = await context.newPage()

  await page.goto(`${BASE}/en/login`)
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/en\/dashboard/)

  /* ---------------------------------------------------------------- brief */
  await page.goto(`${BASE}/en/onboarding`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  /*
   * Every step has its own Next, and on a phone-width viewport it sits below
   * the fold — selecting an option does not advance on its own.
   */
  async function advance() {
    const next = page.getByRole('button', { name: 'Next' }).first()
    await next.scrollIntoViewIfNeeded()
    await next.click()
    await page.waitForTimeout(1000)
    await page.evaluate(() => window.scrollTo(0, 0))
  }

  await frame(page, 'brief-open')

  await page.getByRole('textbox').first().fill('Weekday Roasters')
  await frame(page, 'brief-name')
  await advance()

  await page.getByRole('button', { name: 'Food & Beverage' }).first().click()
  await page.waitForTimeout(500)
  await frame(page, 'brief-industry')
  await advance()

  /* A native <select>, so pick the value rather than clicking a popup. */
  await page.locator('select').first().selectOption('United Arab Emirates')
  await page.waitForTimeout(600)
  await frame(page, 'brief-market')
  await advance()

  await page
    .getByRole('textbox')
    .first()
    .fill(
      'We roast single-origin beans in small batches in Dubai and serve them in a room built for slow mornings. For people who want a good cup without the performance.',
    )
  await page.waitForTimeout(400)
  await frame(page, 'brief-story')
  await advance()

  await page.getByRole('button', { name: /Modern/i }).first().click()
  await page.waitForTimeout(500)
  await frame(page, 'brief-style')
  await advance()

  await frame(page, 'brief-colours')
  await advance()

  await frame(page, 'brief-website')
  await advance()

  /* The last step carries Generate. Shot, never pressed — a run costs real
     credits on the owner's keys and needs the Inngest dev server. */
  await page.waitForTimeout(600)
  await frame(page, 'brief-kit')

  /* ------------------------------------------------------------------ run */
  await shootTheRun(page)

  /* -------------------------------------------------------------- outcome */
  await page.goto(`${BASE}/en/dashboard/projects/${COFFEE}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)
  await frame(page, 'brand-top')

  for (const [heading, name] of [
    ['Logo concepts', 'brand-logos'],
    ['Colour palette', 'brand-palette'],
    ['Typography', 'brand-type'],
    ['Name ideas', 'brand-names'],
    ['Brand story', 'brand-story'],
  ] as const) {
    try {
      await section(page, heading, name)
    } catch {
      console.log(`  ✗ ${name} — no section titled "${heading}"`)
    }
  }

  /*
   * The kit lives behind a <details>. Its summary is on the page whether or not
   * it is open, so scrolling to it is not enough — the posts only exist in the
   * DOM once it has been clicked.
   */
  const kit = page.locator('summary', { hasText: 'Social kit' }).first()
  await anchor(page, kit)
  await kit.click()
  await page.waitForTimeout(2500)
  await section(page, '9 INSTAGRAM POSTS', 'brand-social')

  await page.goto(`${BASE}/sites/weekday-roasters`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  await frame(page, 'site-live')

  await browser.close()
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
