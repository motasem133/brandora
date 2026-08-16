import { expect, test } from '@playwright/test'

import { clearFakeJobs, firstGeneratedProjectId, sql, startFakeJob } from './fixtures/db'

/**
 * The completion screen, and the two things that decide whether it appears.
 *
 * It is driven by the `justFinished` transition in `GenerationPanel`, not by
 * the project's status — the panel has to have *watched* a run end. That
 * distinction only exists in a browser holding an open SSE connection, which is
 * why it is tested here and not against the database: the `done` event is
 * replayed to whoever opens a finished project, so a status assertion would
 * pass on exactly the case that must show nothing.
 *
 * The plan is moved to free and back, because the upsell is the half of this
 * screen worth measuring and the fixture account is on the top paid plan. Every
 * test restores it — six other suites are written against that plan, and a
 * subscription left cancelled here is a fixture failure that surfaces three
 * files away.
 */
test.describe('brand completion screen', () => {
  let projectId: string
  let organizationId: string

  test.beforeAll(async () => {
    projectId = await firstGeneratedProjectId()
    const [row] = await sql`SELECT organization_id FROM projects WHERE id = ${projectId}`
    organizationId = row.organization_id as string
  })

  test.afterEach(async () => {
    await clearFakeJobs()
    await sql`UPDATE subscriptions SET status = 'active' WHERE organization_id = ${organizationId}`
    await sql`UPDATE projects SET status = 'completed' WHERE id = ${projectId}`
  })

  /** Drops the org to the free plan without deleting the row it has to restore. */
  async function downgradeToFree() {
    await sql`UPDATE subscriptions SET status = 'canceled' WHERE organization_id = ${organizationId}`
  }

  /** Ends the in-flight job the way the worker does, so the stream reports it. */
  async function finishJob(sections: string[]) {
    const progress = Object.fromEntries(sections.map((s) => [s, { status: 'done' }]))
    await sql`
      UPDATE generation_jobs
      SET status = 'completed', progress = ${sql.json(progress)}
      WHERE credits_reserved = 0 AND project_id = ${projectId}`
    await sql`UPDATE projects SET status = 'completed' WHERE id = ${projectId}`
  }

  test('a run watched to the end shows the summary and the locked features', async ({ page }) => {
    await downgradeToFree()

    const sections = ['branding', 'logos']
    await sql`UPDATE projects SET status = 'generating' WHERE id = ${projectId}`
    await startFakeJob(projectId, sections)

    await page.goto(`/en/dashboard/projects/${projectId}`)

    // The panel has to see the run in flight first — that is what arms the
    // transition. Without this the finish below is just a cold load.
    await expect(
      page.getByRole('list', { name: 'Run progress' }).getByText(/Logo concepts —/),
    ).toBeVisible()

    await finishJob(sections)

    // The stream polls every 1500ms; the default expect timeout covers it.
    await expect(page.getByText('Everything below was generated from your brief')).toBeVisible()

    /*
     * The manifest names what the run produced.
     *
     * Branding rather than the logos, deliberately. Once the job is no longer
     * active the panel falls back to `sectionsToRun`, which returns the whole
     * plan — and that plan drops `logos` where logo generation is unavailable,
     * which is CI. Asserting the logo line would pass or fail on whether a
     * refresh landed before this line, which is a flake waiting to be blamed on
     * the browser. Branding is in the plan in every environment.
     */
    await expect(page.getByText('A name, palette, fonts and story')).toBeVisible()

    // The upsell, with a real preview rather than a sentence about one.
    await expect(page.getByText('What Creator adds to this brand')).toBeVisible()
    await expect(page.getByText('A published website')).toBeVisible()
    await expect(page.getByText('The designed social kit')).toBeVisible()
    await expect(page.getByText('Vector logo files')).toBeVisible()

    const cta = page.getByRole('link', { name: 'Upgrade to Creator' })
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute('href', '/en/dashboard/billing')
  })

  test('it does not block — dismissing leaves the brand in place', async ({ page }) => {
    await downgradeToFree()

    const sections = ['branding']
    await sql`UPDATE projects SET status = 'generating' WHERE id = ${projectId}`
    await startFakeJob(projectId, sections)

    await page.goto(`/en/dashboard/projects/${projectId}`)
    await expect(
      page.getByRole('list', { name: 'Run progress' }).getByText(/Brand identity —/),
    ).toBeVisible()

    await finishJob(sections)
    await expect(page.getByText('What Creator adds to this brand')).toBeVisible()

    await page.getByRole('button', { name: 'Stay here' }).click()

    await expect(page.getByText('What Creator adds to this brand')).toHaveCount(0)
    // The work itself was never withheld, which is the whole claim of "not a gate".
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  /*
   * The regression this screen is most likely to cause.
   *
   * `done` is replayed the moment the stream opens on a finished project, so
   * without the `witnessedRun` guard every visit to a brand generated last week
   * would congratulate the customer again — and now also try to sell them
   * something. That guard is load-bearing, and nothing else asserts it.
   */
  test('arriving at an already finished brand shows nothing', async ({ page }) => {
    await downgradeToFree()
    await sql`UPDATE projects SET status = 'completed' WHERE id = ${projectId}`

    await page.goto(`/en/dashboard/projects/${projectId}`)

    // The page itself is up, so an empty assertion cannot pass by accident.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Everything below was generated from your brief')).toHaveCount(0)
    await expect(page.getByText('What Creator adds to this brand')).toHaveCount(0)
  })

  test('a paid plan gets the celebration without an upsell', async ({ page }) => {
    const sections = ['branding']
    await sql`UPDATE projects SET status = 'generating' WHERE id = ${projectId}`
    await startFakeJob(projectId, sections)

    await page.goto(`/en/dashboard/projects/${projectId}`)
    await expect(
      page.getByRole('list', { name: 'Run progress' }).getByText(/Brand identity —/),
    ).toBeVisible()

    await finishJob(sections)

    await expect(page.getByText('Everything below was generated from your brief')).toBeVisible()
    await expect(page.getByText('What Creator adds to this brand')).toHaveCount(0)
  })
})
