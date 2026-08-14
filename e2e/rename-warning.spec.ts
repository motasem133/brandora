import { expect, test } from '@playwright/test'

import { clearFakeJobs, firstGeneratedProjectId, sql, startFakeJob } from './fixtures/db'

/**
 * Renaming a brand, and the limit it runs into.
 *
 * The product's documented limit is that a rename renames the record and not
 * the work — the logo has the old name drawn into the image, the website copy
 * and the captions have it written through them. The confirmation is where that
 * is said, and the fork it offers is the reason it is a dialog rather than a
 * sentence somewhere on the page.
 *
 * Everything here restores `business_name`, because the fixture brand is shared
 * and the identity plate is headed from it.
 */
test.describe('renaming a brand', () => {
  let projectId: string

  const FIXTURE_NAME = 'Fixture Co'
  /** A name from the generated ideas, so the picker offers a button for it. */
  const OTHER_NAME = 'Northwind'

  test.beforeAll(async () => {
    projectId = await firstGeneratedProjectId()
  })

  test.afterEach(async () => {
    await clearFakeJobs()
    await sql`UPDATE projects SET business_name = ${FIXTURE_NAME} WHERE id = ${projectId}`
    /* Nothing here should ever start a real run, and a stray one would hold
       credits against the shared account until a sweep collected it. */
    await sql`DELETE FROM generation_jobs WHERE project_id = ${projectId}`
  })

  /** The names sit below the fold, folded into the reference section. */
  async function openPicker(page: import('@playwright/test').Page) {
    await page.goto(`/en/dashboard/projects/${projectId}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }

  test('warns, and names exactly what keeps the old name', async ({ page }) => {
    await openPicker(page)

    await page
      .getByRole('listitem')
      .filter({ hasText: OTHER_NAME })
      .getByRole('button', { name: 'Use this name' })
      .click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await expect(
      dialog.getByText(/still use the old name until you regenerate them/),
    ).toBeVisible()

    /*
     * Derived, not hardcoded — and the reason is worth keeping.
     *
     * `sectionsForProject` drops `logos` when logo generation is unavailable,
     * which is `FAL_KEY` plus object storage. CI has neither, so the sentence
     * there names two things where a configured environment names three. The
     * literal three-item string passed locally and failed in CI on exactly
     * that difference — a green run that was only green because of what
     * happened to be in one `.env`.
     *
     * What holds in both is the relationship: the price is the sum of what the
     * sentence just listed. That is the rule the product actually promises —
     * the price beside a control is the price that will be charged — so it is
     * the one worth asserting.
     */
    const COSTS: Record<string, number> = {
      logo: 6,
      'website copy': 1,
      'social captions': 1,
    }

    const body = (await dialog.textContent()) ?? ''
    const listed = Object.keys(COSTS).filter((item) => body.includes(item))

    /* Written copy is never gated on a key, so this one is always named and a
       silently empty list cannot pass this test. */
    expect(listed, 'the warning must name what carries the old name').toContain('social captions')

    const expected = listed.reduce((total, item) => total + COSTS[item], 0)
    await expect(dialog.getByText(new RegExp(`costs ${expected} credits`))).toBeVisible()

    // Both answers, and the one that spends nothing is the confirm.
    await expect(dialog.getByRole('button', { name: 'Save name only' })).toBeEnabled()
    await expect(dialog.getByRole('button', { name: 'Save and regenerate' })).toBeEnabled()

    // Nothing has been written yet — a dialog that saves before it asks is not
    // a confirmation.
    const [row] = await sql`SELECT business_name FROM projects WHERE id = ${projectId}`
    expect(row.business_name).toBe(FIXTURE_NAME)
  })

  test('"Save name only" saves the name and starts no run', async ({ page }) => {
    await openPicker(page)

    await page
      .getByRole('listitem')
      .filter({ hasText: OTHER_NAME })
      .getByRole('button', { name: 'Use this name' })
      .click()

    await page.getByRole('button', { name: 'Save name only' }).click()

    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByRole('heading', { level: 1, name: OTHER_NAME })).toBeVisible()

    const [row] = await sql`SELECT business_name FROM projects WHERE id = ${projectId}`
    expect(row.business_name).toBe(OTHER_NAME)

    const jobs = await sql`SELECT id FROM generation_jobs WHERE project_id = ${projectId}`
    expect(jobs.length, 'saving the name alone must not queue a run').toBe(0)
  })

  /*
   * The first decision is not a rename.
   *
   * Until a name is chosen everything downstream is drawn with the first idea,
   * so choosing that idea changes nothing and must not warn. A confirmation
   * that fires on the first name anyone picks is one people learn to dismiss
   * without reading, which would cost the warning its whole value later.
   */
  test('choosing the name the work already carries does not warn', async ({ page }) => {
    await sql`UPDATE projects SET business_name = NULL WHERE id = ${projectId}`
    await openPicker(page)

    await page
      .getByRole('listitem')
      .filter({ hasText: FIXTURE_NAME })
      .getByRole('button', { name: 'Use this name' })
      .click()

    await expect(page.getByRole('dialog')).toBeHidden()

    await expect(async () => {
      const [row] = await sql`SELECT business_name FROM projects WHERE id = ${projectId}`
      expect(row.business_name).toBe(FIXTURE_NAME)
    }).toPass()
  })

  test('the paid answer is refused while a run is already in flight', async ({ page }) => {
    await sql`UPDATE projects SET status = 'generating' WHERE id = ${projectId}`
    await startFakeJob(projectId, ['logos'])

    await openPicker(page)

    await page
      .getByRole('listitem')
      .filter({ hasText: OTHER_NAME })
      .getByRole('button', { name: 'Use this name' })
      .click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(/already generating/)).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Save and regenerate' })).toBeDisabled()

    // The free answer stays available — the limit is on spending, not on naming.
    await expect(dialog.getByRole('button', { name: 'Save name only' })).toBeEnabled()

    await sql`UPDATE projects SET status = 'completed' WHERE id = ${projectId}`
  })
})
