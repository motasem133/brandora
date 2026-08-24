import { expect, test } from '@playwright/test'

import { firstGeneratedProjectId, sql } from './fixtures/db'

/**
 * The one file in the variations panel that the plan actually withholds.
 *
 * `/api/files` refuses `logo_svg` to a plan without `vectorExport`, and the
 * panel used to list it anyway: a broken image beside a Download link that
 * navigated to a page of JSON. A customer reported exactly that.
 *
 * The fixture account is on the top paid plan and six other suites depend on
 * that, so the downgrade is undone in `afterAll` the way `brand-complete` does.
 */
test.describe('the vector export gate', () => {
  let projectId: string
  let organizationId: string
  let svgId: string

  test.beforeAll(async () => {
    projectId = await firstGeneratedProjectId()

    const [project] = await sql`
      SELECT p.organization_id, b.primary_logo_file_id
      FROM projects p JOIN branding_assets b ON b.project_id = p.id
      WHERE p.id = ${projectId}`
    organizationId = project.organization_id as string

    const [logo] = await sql`
      SELECT r2_key FROM generated_files WHERE id = ${project.primary_logo_file_id}`

    /* The fixture brand has no trace, so the panel has no vector tile to show.
       Metadata rather than style is what pairs it to the chosen raster. */
    const [svg] = await sql`
      INSERT INTO generated_files (project_id, kind, r2_key, mime_type, metadata)
      VALUES (
        ${projectId}, 'logo_svg',
        ${`projects/${projectId}/logo-e2e-trace.svg`}, 'image/svg+xml',
        ${sql.json({ tracedFrom: logo.r2_key })})
      RETURNING id`
    svgId = svg.id as string
  })

  test.afterAll(async () => {
    await sql`DELETE FROM generated_files WHERE id = ${svgId}`
    await sql`UPDATE subscriptions SET status = 'active' WHERE organization_id = ${organizationId}`
  })

  /** Opens the fold the variations live behind and returns the vector's tile. */
  async function vectorTile(page: import('@playwright/test').Page) {
    await page.goto(`/en/dashboard/projects/${projectId}`)
    await page.getByText('Variations', { exact: true }).click()
    return page.locator('figure').filter({ hasText: 'Vector' }).first()
  }

  test('a paid plan is offered the file', async ({ page }) => {
    await sql`UPDATE subscriptions SET status = 'active' WHERE organization_id = ${organizationId}`

    const tile = await vectorTile(page)
    await expect(tile.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      `/api/files/${svgId}?download`,
    )
  })

  /* Only the page is asserted, not the 403 behind it: the fixture account is
     an administrator, `/api/files` exempts one so support can check that a
     trace ran, and Better Auth's five-minute cookie cache means a role flipped
     mid-test does not reach the route. The route's gate was already there —
     what shipped broken was the page offering what it refuses. */
  test('a free plan is offered the upgrade instead', async ({ page }) => {
    await sql`UPDATE subscriptions SET status = 'canceled' WHERE organization_id = ${organizationId}`

    const tile = await vectorTile(page)
    await expect(tile.getByRole('link', { name: 'Upgrade' })).toHaveAttribute(
      'href',
      '/en/dashboard/billing',
    )
    await expect(tile.getByRole('link', { name: 'Download' })).toHaveCount(0)
    // No <img> either: its source is the route below, so it could only ever
    // have drawn a broken-image icon.
    await expect(tile.locator('img')).toHaveCount(0)
  })
})
