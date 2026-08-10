import { expect, test } from '@playwright/test'

import { firstGeneratedProjectId } from './fixtures/db'

/**
 * The brand's own words: readable without hunting, editable by their owner,
 * and read-only to anyone else.
 *
 * All three shipped on the same day and none of them had a test. The first two
 * are one customer's report — "I couldn't see the brand story or voice" —
 * where everything had in fact generated correctly and was folded behind a
 * heading, and where the screen support would have used to check showed none
 * of it at all. A section that hides what somebody paid for fails silently, so
 * only reading the page back catches it.
 *
 * The third is the boundary. Support looks; it does not reach in. Every
 * control on that screen would be an `orgAction` scoped to the administrator's
 * own workspace, so an Edit button there acts on the wrong project or errors —
 * and one flag is all that stands between those two screens.
 */
test.describe('brand copy', () => {
  let projectId: string

  test.beforeAll(async () => {
    projectId = await firstGeneratedProjectId()
  })

  test('the written brand is readable without opening anything', async ({ page }) => {
    await page.goto(`/en/dashboard/projects/${projectId}`)

    /*
     * No click first. This is the whole point: the section used to be folded,
     * so the story and the voice were invisible to anyone who did not know to
     * open a heading.
     */
    for (const label of ['Slogan', 'Brand story', 'Brand voice', 'Brand values']) {
      await expect(
        page.getByRole('heading', { name: label, exact: true }),
        `${label} should be on the page unopened`,
      ).toBeVisible()
    }
  })

  test('a customer can change one word, and it sticks', async ({ page }) => {
    await page.goto(`/en/dashboard/projects/${projectId}`)

    const row = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: 'Slogan', exact: true }) })
      .last()

    const field = page.getByLabel('Slogan', { exact: true })

    await row.getByRole('button', { name: 'Edit' }).click()
    const original = await field.inputValue()
    const updated = `Tested at ${Date.now() % 100000}`

    await field.fill(updated)
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    /*
     * Asserted on the page rather than in the editor. Everything outside the
     * editor is server-rendered from the row, so seeing it there proves the
     * write landed and the page re-read it — an editor still showing what was
     * typed proves only that typing works.
     *
     * `.first()` because the slogan is on this page four times over: the
     * identity plate, the type specimen beside it, the project rail, and the
     * editor's own read view. Asserting presence, not a count — the count is a
     * design question and this test has no business fixing it in place.
     */
    await expect(page.locator('main').getByText(updated).first()).toBeVisible({ timeout: 30_000 })

    await page.reload()
    await expect(page.locator('main').getByText(updated).first()).toBeVisible()

    // Put it back, so repeat runs and every other spec start where they were.
    await page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: 'Slogan', exact: true }) })
      .last()
      .getByRole('button', { name: 'Edit' })
      .click()
    await page.getByLabel('Slogan', { exact: true }).fill(original)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.locator('main').getByText(original).first()).toBeVisible({ timeout: 30_000 })
  })

  test('a story too short to render is refused before it is sent', async ({ page }) => {
    await page.goto(`/en/dashboard/projects/${projectId}`)

    await page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: 'Brand story', exact: true }) })
      .last()
      .getByRole('button', { name: 'Edit' })
      .click()

    await page.getByLabel('Brand story', { exact: true }).fill('Too short to be a story.')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    /*
     * The bounds are the assistant's own, shared so that a person and a model
     * are held to the same contract. Checked in the browser as well as on the
     * server because finding out after a round trip, having written 140
     * characters, is the wrong moment to be told.
     */
    await expect(page.getByRole('alert').first()).toContainText('150')

    await page.getByRole('button', { name: 'Cancel' }).first().click()
  })

  test('support can read the same words and cannot change them', async ({ page }) => {
    await page.goto(`/en/admin/projects/${projectId}`)

    for (const label of ['Slogan', 'Brand story', 'Brand voice', 'Brand values', 'Colour palette']) {
      await expect(
        page.getByRole('heading', { name: label, exact: true }),
        `${label} should be on the support view`,
      ).toBeVisible()
    }

    /*
     * The line this whole screen is built around. Not "no Edit button on the
     * brand copy" — none anywhere on the page.
     */
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0)
  })
})
