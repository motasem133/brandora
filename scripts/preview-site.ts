import 'dotenv/config'

import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { and, eq, isNull } from 'drizzle-orm'

import { db } from '../src/server/db'
import { projects, websiteAssets } from '../src/server/db/schema'

/**
 * Every page of a customer's published site, at every width, for nothing.
 *
 * The same argument as `preview-kit.ts`, which made the kit's design pass
 * possible: a site is expensive to *look at* — it takes a generated brand, a
 * generation run and a publish before there is anything on screen — so it has
 * never been iterated on. Nothing here generates or publishes anything. It
 * drives a browser over sites that already exist.
 *
 * Widths are the three that decide a layout: a phone, the tablet fold, and a
 * desktop. The renderer has had exactly one breakpoint for its whole life, so
 * the middle one is where its faults live.
 *
 * Usage — needs a server already running (`pnpm dev`, or a build on 3100):
 *   pnpm preview:site                        every published site, every page
 *   pnpm preview:site --site=desert-bloom    one site
 *   pnpm preview:site --page=about           one page
 *   pnpm preview:site --width=390            one width
 *   pnpm preview:site --base=http://localhost:3000
 *
 * Output lands in `.preview/site/` (git-ignored).
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  }),
)

const BASE = args.base ?? 'http://localhost:3100'
const OUT = '.preview/site'
const PAGES = args.page ? [args.page] : ['home', 'about', 'services', 'contact']
const WIDTHS = args.width ? [Number(args.width)] : [390, 768, 1440]

async function main() {
  await mkdir(OUT, { recursive: true })

  const sites = await db
    .select({ subdomain: websiteAssets.subdomain, title: projects.title })
    .from(websiteAssets)
    .innerJoin(projects, eq(projects.id, websiteAssets.projectId))
    .where(and(eq(websiteAssets.isPublished, true), isNull(projects.deletedAt)))

  const wanted = args.site ? sites.filter((s) => s.subdomain === args.site) : sites
  if (!wanted.length) {
    throw new Error(
      args.site
        ? `no published site with subdomain "${args.site}"`
        : 'no published sites — publish one, or seed with scripts/seed-test-data.mjs',
    )
  }

  const browser = await chromium.launch()
  console.log(`${BASE} — ${wanted.length} site(s), ${PAGES.length} page(s), ${WIDTHS.join('/')}\n`)

  for (const site of wanted) {
    console.log(`${site.title} (${site.subdomain})`)

    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: 900 } })

      for (const name of PAGES) {
        const url = `${BASE}/sites/${site.subdomain}${name === 'home' ? '' : `/${name}`}`
        const response = await page.goto(url, { waitUntil: 'networkidle' })

        const file = `${OUT}/${site.subdomain}-${name}-${width}.png`
        await page.screenshot({ path: file, fullPage: true })

        const images = await page.locator('img').count()
        console.log(
          `  ${String(response?.status() ?? '—').padEnd(4)}${name.padEnd(9)}${String(width).padEnd(6)}` +
            `${images} image${images === 1 ? '' : 's'}  ${file}`,
        )
      }

      await page.close()
    }
  }

  await browser.close()
  process.exit(0)
}

main()
