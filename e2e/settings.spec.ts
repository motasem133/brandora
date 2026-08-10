import { expect, test } from '@playwright/test'

/**
 * Saving a profile has to be visible.
 *
 * The first version wrote straight to the table while every page read the name
 * from a five-minute session cache, so a successful save looked like a failed
 * one. Asserting the database would have passed; only reading the screen back
 * catches it.
 */
/** Two saves, each a round trip to a database in another region. */
const SAVE_TIMEOUT = 30_000

test.describe('settings', () => {
  test('a changed name shows immediately, and after a reload', async ({ page }) => {
    /*
     * The one intermittent failure in the suite, and it was never this test's
     * fault: it waited 15 s for a save that writes the row, invalidates the
     * session cache and re-renders, against Neon in `us-east-2` from wherever
     * the tests are running. Past the tail of that, "Saved" is late rather than
     * absent — nothing here was ever broken when it failed.
     *
     * Two waits of 30 s do not fit in the 60 s default, hence the budget. When
     * the database moves to `us-east-1` this can go back to 15 s and mean it.
     */
    test.setTimeout(120_000)

    await page.goto('/en/dashboard/settings')

    // Exact, because "Workspace name" also contains "Name".
    const field = page.getByLabel('Name', { exact: true })
    const original = await field.inputValue()
    // The greeting renders only the first word, so that is where the unique
    // part has to live for the assertion to mean anything.
    const unique = `Tester${Date.now() % 100000}`
    const updated = `${unique} Fixture`

    await field.fill(updated)
    const profileCard = page.locator('div').filter({ hasText: 'Profile' }).last()
    await profileCard.getByRole('button', { name: 'Save' }).click()
    await expect(profileCard.getByText('Saved')).toBeVisible({ timeout: SAVE_TIMEOUT })

    // The greeting reads from the session, which is where the stale value came
    // from — so it is the part worth checking.
    await page.goto('/en/dashboard')
    await expect(page.getByRole('heading', { name: new RegExp(unique) })).toBeVisible()

    await page.goto('/en/dashboard/settings')
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue(updated)

    // Put it back so repeat runs start from the same place.
    const card = page.locator('div').filter({ hasText: 'Profile' }).last()
    await page.getByLabel('Name', { exact: true }).fill(original)
    await card.getByRole('button', { name: 'Save' }).click()
    await expect(card.getByText('Saved')).toBeVisible({ timeout: SAVE_TIMEOUT })
  })
})
