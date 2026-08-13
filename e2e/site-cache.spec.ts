import { expect, test } from '@playwright/test'

import { firstGeneratedProjectId, sql } from './fixtures/db'

/**
 * Editing is private; publishing is what visitors see.
 *
 * This file used to assert the exact opposite — "an edit reaches the published
 * page immediately" — and it was right about the code and wrong about the
 * product. The builder autosaved into the column the live site reads and purged
 * its cache, so a customer correcting their opening hours had every half-typed
 * version in front of visitors a second and a half later, and nothing in the
 * product said so.
 *
 * The cache is still the thing that fails quietly, so both halves are held
 * here: an edit must *not* appear, and publishing must make it appear at once
 * rather than when the five-minute window happens to expire.
 *
 * The page is warmed first on purpose. Asserting against a cold cache proves
 * nothing — the bug being guarded against only exists once there is an entry
 * to go stale.
 */
test.describe('draft and publish', () => {
  let projectId: string
  let subdomain: string

  test.beforeAll(async () => {
    projectId = await firstGeneratedProjectId()
    const [row] = await sql`
      SELECT subdomain FROM website_assets WHERE project_id = ${projectId} AND is_published = true`
    subdomain = row?.subdomain as string
  })

  test('an edit stays off the published page until it is published', async ({ page }) => {
    test.skip(!subdomain, 'the fixture site is not published')

    // Warm it, so there is a cached entry for the publish to have to beat.
    await page.goto(`/sites/${subdomain}`)
    await expect(page.locator('body')).toBeVisible()

    const marker = `Draft check ${Date.now() % 100000}`

    await page.goto(`/en/dashboard/projects/${projectId}/builder`)
    await page.getByTestId('canvas-block').first().getByRole('button', { name: /^Select / }).click()

    const field = page.getByTestId('inspector').locator('input, textarea').first()
    await field.fill(marker)

    await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
      timeout: 20_000,
    })

    await page.goto(`/sites/${subdomain}`)
    await expect(
      page.locator('body'),
      'a saved edit must not be on the published page — nothing is public until publishing',
    ).not.toContainText(marker)

    // And the editor says so, rather than leaving the customer to wonder.
    await page.goto(`/en/dashboard/projects/${projectId}/builder`)
    await expect(page.getByTestId('online-status')).toContainText(/aren't online yet/i)

    await page.getByRole('button', { name: /^Update$/ }).click()
    await page.getByTestId('publish-panel').getByRole('button', { name: /^Update$/ }).click()

    await expect(page.getByTestId('online-status')).toContainText(/up to date/i, {
      timeout: 20_000,
    })

    await page.goto(`/sites/${subdomain}`)
    await expect(
      page.locator('body'),
      'publishing must reach the live page at once, not when the window expires',
    ).toContainText(marker)
  })
})
