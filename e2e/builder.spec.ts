import { expect, test } from '@playwright/test'

import { sql } from './fixtures/db'

/**
 * The website builder.
 *
 * The most interaction-heavy surface in the product and the least reachable by
 * anything other than a browser: adding a section, selecting it, editing a
 * field and having the change persist all happen client-side.
 */
test.describe('website builder', () => {
  let projectId: string

  test.beforeAll(async () => {
    const [row] = await sql`SELECT project_id FROM website_assets LIMIT 1`
    if (!row) throw new Error('No website to test against.')
    projectId = row.project_id as string
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(`/en/dashboard/projects/${projectId}/builder`)
    await expect(page.getByTestId('canvas')).toBeVisible()
  })

  test('opens with the page tabs, section library and publish control', async ({ page }) => {
    await expect(page.getByTestId('page-tabs')).toBeVisible()
    await expect(page.getByTestId('block-library')).toBeVisible()
    await expect(page.getByRole('button', { name: /Publish|Published/ })).toBeVisible()
  })

  test('adding a section renders it and autosaves', async ({ page }) => {
    const sections = page.getByTestId('canvas').locator('section')
    const before = await sections.count()

    await page.getByTestId('block-library').getByRole('button', { name: 'Text section' }).click()

    await expect(sections).toHaveCount(before + 1)
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
      timeout: 20_000,
    })
  })

  test('editing a field updates the canvas and persists', async ({ page }) => {
    await page.getByTestId('canvas').locator('section').first().click()

    const inspector = page.getByTestId('inspector')
    const field = inspector.locator('input, textarea').first()
    await expect(field).toBeVisible()

    const edited = `Playwright ${Date.now()}`
    await field.fill(edited)

    await expect(page.getByTestId('canvas').getByText(edited)).toBeVisible()
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
      timeout: 20_000,
    })

    // Reload to prove it round-tripped rather than only living in memory.
    await page.reload()
    await expect(page.getByTestId('canvas').getByText(edited)).toBeVisible()
  })

  test('switching pages changes the canvas', async ({ page }) => {
    const sections = page.getByTestId('canvas').locator('section')
    const home = await sections.count()

    await page.getByTestId('page-tabs').getByRole('button', { name: 'Contact' }).click()

    await expect(sections).not.toHaveCount(home, { timeout: 10_000 })
  })

  test('a section can be deleted', async ({ page }) => {
    // The controls live on the block wrapper, not inside the rendered section.
    const blocks = page.getByTestId('canvas-block')
    const before = await blocks.count()
    test.skip(before === 0, 'nothing to delete on this page')

    const first = blocks.first()
    await first.hover()
    await first.getByRole('button', { name: 'Delete' }).click()

    await expect(blocks).toHaveCount(before - 1)
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
      timeout: 20_000,
    })
  })
})
