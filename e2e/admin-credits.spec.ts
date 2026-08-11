import { expect, test } from '@playwright/test'

import { sql } from './fixtures/db'

/**
 * Moving somebody's credits from a screen rather than from psql.
 *
 * `adjustCredits` existed with the ledger and was wired to nothing, so the
 * only way to grant a customer credits was a statement typed against
 * production — and two were. The adjustments table still shows them with no
 * note and no author, which is exactly what a hand-written write to a money
 * table costs: a balance that changed and nothing that says why.
 *
 * The test grants and then takes back the same amount, so it can assert the
 * arithmetic without leaving the fixture richer than it found it — and so the
 * reversal, which is the other half of what this screen is for, is exercised
 * too.
 */
test.describe('admin credits', () => {
  const EMAIL = process.env.E2E_EMAIL ?? 'e2e@brandora-test.com'

  async function balance(): Promise<number> {
    const [row] = await sql`
      SELECT o.credit_balance FROM organizations o
      JOIN members m ON m.organization_id = o.id
      JOIN users u ON u.id = m.user_id
      WHERE u.email = ${EMAIL}
      LIMIT 1`
    return Number(row.credit_balance)
  }

  test('a grant moves the balance, and says who and why', async ({ page }) => {
    const before = await balance()

    /* The screen asks before it moves money, which is the point of it. */
    page.on('dialog', (dialog) => dialog.accept())

    await page.goto(`/en/admin/credits?q=${encodeURIComponent(EMAIL)}`)

    const row = page.locator('table').first().locator('tbody tr').first()
    await expect(row).toContainText(String(before))

    const note = `Test grant ${Date.now() % 100000}`
    await row.getByRole('button', { name: 'Adjust' }).click()
    await page.getByLabel('Amount').fill('7')

    /* What the balance becomes, before it becomes it. */
    await expect(row).toContainText(String(before + 7))

    await page.getByLabel('Note').fill(note)
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.locator('body')).toContainText(note, { timeout: 30_000 })
    expect(await balance(), 'the grant should have landed').toBe(before + 7)

    /*
     * The ledger is the record, not the balance. A screen that moved the
     * number without writing why would be the thing this replaced.
     */
    const [entry] = await sql`
      SELECT amount, metadata ->> 'note' AS note, metadata ->> 'by' AS by
      FROM credit_transactions
      WHERE reason = 'admin_adjustment'
      ORDER BY created_at DESC LIMIT 1`

    expect(Number(entry.amount)).toBe(7)
    expect(entry.note).toBe(note)
    expect(entry.by, 'the ledger records which administrator did it').toBe(EMAIL)

    // Put it back, and exercise a correction while doing so.
    await page.goto(`/en/admin/credits?q=${encodeURIComponent(EMAIL)}`)
    const again = page.locator('table').first().locator('tbody tr').first()
    await again.getByRole('button', { name: 'Adjust' }).click()
    await page.getByLabel('Amount').fill('-7')
    /*
     * The reversal carries the grant's own id in its note.
     *
     * It read `Reversing the test grant`, a constant — so the wait below was
     * satisfied by a row from a previous run and the balance was asserted
     * before this reversal had landed. It passed alone and failed in the
     * suite, which is the signature of waiting for something that was already
     * there.
     */
    const reversal = `Reversing ${note}`
    await page.getByLabel('Note').fill(reversal)
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.locator('body')).toContainText(reversal, { timeout: 30_000 })
    expect(await balance(), 'the reversal should have restored it').toBe(before)
  })
})
