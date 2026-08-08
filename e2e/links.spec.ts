import { expect, test } from '@playwright/test'

import { firstGeneratedProjectId } from './fixtures/db'

/**
 * Every internal link must resolve.
 *
 * Four pages the UI linked to did not exist — pricing, both password-reset
 * screens and settings — and nothing caught it, because the suites only visited
 * routes already known to exist. Crawling what the pages actually link to is
 * the check that would have.
 */
test.describe('internal links', () => {
  let projectId: string

  test.beforeAll(async () => {
    projectId = await firstGeneratedProjectId()
  })

  const pages = [
    { name: 'landing', path: '/en' },
    { name: 'pricing', path: '/en/pricing' },
    { name: 'dashboard', path: '/en/dashboard' },
    { name: 'projects', path: '/en/dashboard/projects' },
    { name: 'studio', path: '/en/dashboard/studio' },
    { name: 'billing', path: '/en/dashboard/billing' },
    { name: 'settings', path: '/en/dashboard/settings' },
  ]

  for (const page_ of pages) {
    test(`no dead links on the ${page_.name} page`, async ({ page, request }) => {
      await page.goto(page_.path)

      const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) =>
        Array.from(new Set(links.map((link) => (link as HTMLAnchorElement).getAttribute('href')!))),
      )

      expect(hrefs.length).toBeGreaterThan(0)

      const broken: string[] = []
      for (const href of hrefs) {
        // Downloads redirect to storage, which needs credentials this run has
        // no reason to hold.
        if (href.startsWith('/api/')) continue

        const response = await request.get(href, { maxRedirects: 0 })
        const status = response.status()

        // 2xx is fine; 3xx means a guard redirected, which is a working route.
        if (status >= 400) broken.push(`${href} -> ${status}`)
      }

      expect(broken, `dead links found on ${page_.path}`).toEqual([])
    })
  }

  test('project tabs and the builder resolve', async ({ page, request }) => {
    await page.goto(`/en/dashboard/projects/${projectId}`)

    const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) =>
      Array.from(new Set(links.map((link) => (link as HTMLAnchorElement).getAttribute('href')!))),
    )

    const broken: string[] = []
    for (const href of hrefs) {
      if (href.startsWith('/api/')) continue
      const response = await request.get(href, { maxRedirects: 0 })
      if (response.status() >= 400) broken.push(`${href} -> ${response.status()}`)
    }

    expect(broken, 'dead links on the project page').toEqual([])
  })
})
