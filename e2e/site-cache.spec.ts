import { expect, test } from '@playwright/test'

import { firstGeneratedProjectId, sql } from './fixtures/db'

/**
 * A published site is cached, and an edit still shows up at once.
 *
 * Every visit to a customer's site used to read the database — the most public
 * surface this product has was the only one with no caching at all. It is
 * cached per host now, for five minutes, which is safe exactly to the extent
 * that publishing and editing purge it.
 *
 * That is what this holds. The window is the easy half; the invalidation is
 * the half that fails quietly, and it fails in the worst possible way: a
 * customer changes their own site, looks at it, and sees the old one.
 *
 * The page is warmed first on purpose. Asserting against a cold cache proves
 * nothing — the bug being guarded against only exists once there is an entry
 * to go stale.
 */
test.describe('published site caching', () => {
  let projectId: string
  let subdomain: string

  test.beforeAll(async () => {
    projectId = await firstGeneratedProjectId()
    const [row] = await sql`
      SELECT subdomain FROM website_assets WHERE project_id = ${projectId} AND is_published = true`
    subdomain = row?.subdomain as string
  })

  test('an edit reaches the published page immediately', async ({ page }) => {
    test.skip(!subdomain, 'the fixture site is not published')

    // Warm it, so there is a cached entry for the edit to have to beat.
    await page.goto(`/sites/${subdomain}`)
    await expect(page.locator('body')).toBeVisible()

    const marker = `Cache check ${Date.now() % 100000}`

    await page.goto(`/en/dashboard/projects/${projectId}/builder`)
    await page.getByTestId('canvas-block').first().getByRole('button', { name: /^Select / }).click()

    const field = page.getByTestId('inspector').locator('input, textarea').first()
    await field.fill(marker)

    /* The builder autosaves; the published page must not be checked before the
       write it is meant to reflect has landed. */
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
      timeout: 20_000,
    })

    await page.goto(`/sites/${subdomain}`)
    await expect(
      page.locator('body'),
      'the edit should be on the published page, not waiting for the window to expire',
    ).toContainText(marker)
  })
})
