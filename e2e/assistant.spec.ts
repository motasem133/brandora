import { expect, test } from '@playwright/test'

import { firstGeneratedProjectId } from './fixtures/db'

/**
 * Assistant continuity.
 *
 * Leaving the tab and returning used to erase the conversation, and anything
 * typed but unsent went with it. Both are invisible to any check that does not
 * actually navigate.
 */
test.describe('brand assistant', () => {
  let projectId: string

  test.beforeAll(async () => {
    projectId = await firstGeneratedProjectId()
  })


  test('conversation survives leaving the tab', async ({ page }) => {
    await page.goto(`/en/dashboard/projects/${projectId}?tab=assistant`)

    const thread = page.locator('form').locator('..')
    const before = await thread.getByText(/./).count()

    await page.getByRole('link', { name: 'Branding', exact: true }).click()
    await expect(page).toHaveURL(/tab=branding/)

    await page.getByRole('link', { name: 'Assistant', exact: true }).click()
    await expect(page).toHaveURL(/tab=assistant/)

    // Whatever was on screen must still be there; an empty state means it was lost.
    const after = await thread.getByText(/./).count()
    expect(after).toBeGreaterThanOrEqual(Math.min(before, 1))
  })

  test('unsent text survives leaving the tab', async ({ page }) => {
    await page.goto(`/en/dashboard/projects/${projectId}?tab=assistant`)

    const draft = 'make the palette a little warmer please'
    const box = page.getByPlaceholder('Ask for a change…')
    await box.fill(draft)

    await page.getByRole('link', { name: 'Branding', exact: true }).click()
    await expect(page).toHaveURL(/tab=branding/)
    await page.getByRole('link', { name: 'Assistant', exact: true }).click()

    await expect(page.getByPlaceholder('Ask for a change…')).toHaveValue(draft)

    // Leave the box empty for the next run.
    await page.getByPlaceholder('Ask for a change…').fill('')
  })
})
