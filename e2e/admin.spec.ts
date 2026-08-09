import { expect, test } from '@playwright/test'

import { sql } from './fixtures/db'

/**
 * The support view: a customer's project, read by someone who does not own it.
 *
 * Two things are worth a browser rather than a reading. The first is that it
 * opens at all — it is reached by clicking a row, and a table whose rows are
 * not doors is the whole feature missing. The second is that a customer's
 * files load: `/api/files/[id]` scopes to the caller's organization, which is
 * exactly right for customers and would have made this screen a page of broken
 * images.
 */
test.describe('admin support view', () => {
  test('a project opens from the list and shows what the run produced', async ({ page }) => {
    await page.goto('/en/admin/projects')

    const firstRow = page.locator('tbody tr').first()
    const title = await firstRow.locator('a').first().innerText()
    await firstRow.locator('a').first().click()

    await expect(page).toHaveURL(/\/en\/admin\/projects\/[0-9a-f-]{36}/)

    /*
     * Exactly one `<h1>`: the page is about the customer's brand, and the
     * identity plate renders the same name as a section heading rather than a
     * second subject.
     */
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)

    // The checklist this screen exists for, and who it is about.
    await expect(page.getByRole('heading', { name: 'What the run produced' })).toBeVisible()
    await expect(page.getByText('Customer', { exact: true })).toBeVisible()
    await expect(page.getByText(title, { exact: false }).first()).toBeVisible()
  })

  /*
   * The project belongs to somebody else entirely. Before the widening, the
   * join in the files route answered 404 for every asset on this page.
   */
  test('a file belonging to another workspace is readable by an admin', async ({ request }) => {
    const [file] = await sql`
      SELECT f.id
      FROM generated_files f
      JOIN projects p ON p.id = f.project_id
      JOIN organizations o ON o.id = p.organization_id
      WHERE o.id NOT IN (
        SELECT m.organization_id FROM members m
        JOIN users u ON u.id = m.user_id
        WHERE u.email = ${process.env.E2E_EMAIL ?? 'e2e@brandora-test.com'}
      )
      LIMIT 1`

    test.skip(!file, 'no other workspace has generated files in this database')

    // A redirect to storage is the success case; the failure case was a 404.
    const response = await request.get(`/api/files/${file.id}`, { maxRedirects: 0 })
    expect(response.status()).toBe(302)
  })

  test('the customer view stays closed to a project the admin does not own', async ({ page }) => {
    const [project] = await sql`
      SELECT p.id
      FROM projects p
      WHERE p.deleted_at IS NULL AND p.organization_id NOT IN (
        SELECT m.organization_id FROM members m
        JOIN users u ON u.id = m.user_id
        WHERE u.email = ${process.env.E2E_EMAIL ?? 'e2e@brandora-test.com'}
      )
      LIMIT 1`

    test.skip(!project, 'no other workspace has a project in this database')

    /*
     * Being an administrator does not widen the customer's own page. That page
     * is all controls, every one of them scoped to the signed-in organization,
     * and it must keep answering 404 here — otherwise support is one press away
     * from acting on a project as though it were theirs.
     */
    const response = await page.goto(`/en/dashboard/projects/${project.id}`)
    expect(response?.status()).toBe(404)
  })
})
