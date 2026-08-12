import { expect, test } from '@playwright/test'

import { firstGeneratedProjectId, sql } from './fixtures/db'

/**
 * Ad copy, from the control that asks for it to the words a customer pastes.
 *
 * The generation itself is asserted by `rendered-content-test.ts` against the
 * schema and by a real model call during development; what a browser has to
 * prove is the half that makes it worth generating. An ad is four strings that
 * go into four different boxes in an ad manager, and the library used to show
 * two clamped lines of whatever it held. Copy that cannot be got out of the
 * page is copy that was not delivered.
 *
 * The row is written straight into the database rather than generated: the real
 * path costs a credit and fifty seconds of a model, and none of that changes
 * what this asserts.
 */
test.describe('ad copy', () => {
  let projectId: string
  let itemId: string

  test.beforeAll(async () => {
    projectId = await firstGeneratedProjectId()
    const [project] = await sql`SELECT organization_id FROM projects WHERE id = ${projectId}`
    const [row] = await sql`
      INSERT INTO content_items
        (id, root_id, organization_id, project_id, type, status, title, brief, language, body)
      VALUES (gen_random_uuid(), gen_random_uuid(), ${project.organization_id}, ${projectId},
              'ad', 'ready', 'Launch offer', 'First bag free', 'en',
              ${sql.json({
                kind: 'ad',
                items: [
                  {
                    intent: 'Clear offer',
                    headline: 'First bag free',
                    body: 'Subscribe to the house blend and the first one is on us.',
                    cta: 'Start subscription',
                  },
                ],
              })})
      RETURNING id`
    itemId = row.id
  })

  test.afterAll(async () => {
    await sql`DELETE FROM content_items WHERE id = ${itemId}`
  })

  test('the four parts are readable and separately copyable', async ({ page }) => {
    await page.goto(`/en/dashboard/projects/${projectId}`)

    const row = page.getByRole('listitem').filter({ hasText: 'Launch offer' })
    await expect(row).toBeVisible()
    await expect(row.getByText('Ad copy')).toBeVisible()

    /* Shut, the row is a line. This is the whole complaint about the old
       library, so it is asserted rather than assumed. */
    await expect(row.getByText('Start subscription')).toBeHidden()

    await row.getByText('First bag free').first().click()

    for (const label of ['Headline', 'Body', 'Button']) {
      await expect(row.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(row.getByText('Start subscription')).toBeVisible()

    /* One control for the whole ad and one per field, because the fields are
       pasted into different boxes. */
    const copies = row.getByRole('button', { name: /Copy/i })
    expect(await copies.count()).toBeGreaterThanOrEqual(4)
  })

  test('the composer offers it, and counts in ads', async ({ page }) => {
    await page.goto('/en/dashboard/studio')

    const type = page.getByLabel('Content type')
    await expect(type.locator('option', { hasText: 'Ad copy' })).toHaveCount(1)

    await type.selectOption('ad')
    await expect(page.getByText('How many ads')).toBeVisible()
  })
})
