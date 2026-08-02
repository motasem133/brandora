import { expect, test } from '@playwright/test'

import { clearFakeJobs, firstGeneratedProjectId, sql } from './fixtures/db'

/**
 * Generation progress across navigation.
 *
 * Moving between tabs mid-run made the progress disappear until a hard refresh:
 * Next served a cached payload from before the job started and the panel
 * trusted it. The database was correct throughout, so only a browser sees this.
 */
test.describe('generation progress', () => {
  let projectId: string

  test.beforeAll(async () => {
    projectId = await firstGeneratedProjectId()
  })

  test.afterEach(async () => {
    await clearFakeJobs()
  })


  test('a running job shows only the steps it is running', async ({ page }) => {
    await sql`UPDATE projects SET status = 'generating' WHERE id = ${projectId}`
    await sql`
      INSERT INTO generation_jobs (project_id, trigger, sections, progress, status, credits_reserved)
      VALUES (${projectId}, 'retry_section', ${sql.json(['logos'])},
              ${sql.json({ logos: { status: 'running' } })}, 'running', 0)`

    await page.goto(`/en/dashboard/projects/${projectId}`)

    await expect(page.getByText(/Logo concepts —/)).toBeVisible()
    // The other sections are not part of this run and must not be listed.
    await expect(page.getByText(/Website content —/)).toHaveCount(0)
    await expect(page.getByText(/Social media kit —/)).toHaveCount(0)

    await sql`UPDATE projects SET status = 'completed' WHERE id = ${projectId}`
  })

  test('progress survives a tab switch even from a stale page', async ({ page }) => {
    /*
     * The exact failure: the page is rendered as completed while a job is in
     * flight, which is what a cached payload looks like. The panel must correct
     * itself from the live stream rather than staying hidden.
     */
    await sql`UPDATE projects SET status = 'completed' WHERE id = ${projectId}`
    await page.goto(`/en/dashboard/projects/${projectId}?tab=branding`)

    await sql`
      INSERT INTO generation_jobs (project_id, trigger, sections, progress, status, credits_reserved)
      VALUES (${projectId}, 'retry_section', ${sql.json(['logos'])},
              ${sql.json({ logos: { status: 'running' } })}, 'running', 0)`

    await page.getByRole('link', { name: 'Assistant', exact: true }).click()
    await expect(page).toHaveURL(/tab=assistant/)
    await page.getByRole('link', { name: 'Branding', exact: true }).click()

    await expect(page.getByText(/Generating your brand|Logo concepts —/).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('the regenerate button reports that work started', async ({ page }) => {
    await sql`
      INSERT INTO generation_jobs (project_id, trigger, sections, progress, status, credits_reserved)
      VALUES (${projectId}, 'retry_section', ${sql.json(['logos'])},
              ${sql.json({ logos: { status: 'running' } })}, 'running', 0)`

    await page.goto(`/en/dashboard/projects/${projectId}?tab=branding`)

    const button = page.getByRole('button', { name: /Generating logos|Regenerate logos/ })
    await expect(button).toBeVisible()
    await expect(button).toBeDisabled()
    await expect(button).toHaveText(/Generating logos/)
  })
})
