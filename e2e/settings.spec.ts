import { expect, test } from '@playwright/test'

/**
 * Saving a profile has to be visible.
 *
 * The first version wrote straight to the table while every page read the name
 * from a five-minute session cache, so a successful save looked like a failed
 * one. Asserting the database would have passed; only reading the screen back
 * catches it.
 */
test.describe('settings', () => {
  test('a changed name shows immediately, and after a reload', async ({ page }) => {
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
    await expect(profileCard.getByText('Saved')).toBeVisible({ timeout: 15_000 })

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
    await expect(card.getByText('Saved')).toBeVisible({ timeout: 15_000 })
  })
})
