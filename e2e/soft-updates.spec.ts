import { expect, test } from '@playwright/test'

import { clearFakeJobs, firstGeneratedProjectId, sql } from './fixtures/db'

/**
 * The page keeps up without being thrown away.
 *
 * Four controls used to answer a finished action with `window.location.reload()`
 * — a run landing a section, a run finishing, choosing a logo, and a piece of
 * content finishing in the Studio. All four were written against one fault: a
 * Suspense boundary blocking the transition `router.refresh()` runs in. The
 * boundary is gone and they are refreshes now.
 *
 * Two things have to hold, and asserting only the first would pass on the old
 * behaviour too: the page shows what the server now says, *and* it was never
 * reloaded to find out. `beforeunload` is the discriminator — a soft update
 * never fires it.
 *
 * What the server says is changed underneath the page on purpose. It is the
 * only proof that the update went back for fresh data rather than re-rendering
 * what it already had.
 */
async function watchForReloads(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    ;(window as unknown as { __reloaded: boolean }).__reloaded = false
    window.addEventListener('beforeunload', () => {
      ;(window as unknown as { __reloaded: boolean }).__reloaded = true
    })
  })

  return async () =>
    page.evaluate(() => (window as unknown as { __reloaded: boolean }).__reloaded)
}

test.describe('soft updates', () => {
  let projectId: string
  let slogan: string | null

  test.beforeAll(async () => {
    projectId = await firstGeneratedProjectId()
    const [row] = await sql`
      SELECT slogan FROM branding_assets WHERE project_id = ${projectId}`
    slogan = row.slogan
  })

  test.afterEach(async () => {
    await clearFakeJobs()
    await sql`UPDATE projects SET status = 'completed' WHERE id = ${projectId}`
    await sql`
      UPDATE branding_assets SET slogan = ${slogan} WHERE project_id = ${projectId}`
  })

  test('a section landing paints, without throwing the page away', async ({ page }) => {
    await sql`UPDATE projects SET status = 'generating' WHERE id = ${projectId}`
    const [job] = await sql`
      INSERT INTO generation_jobs (project_id, trigger, sections, progress, status, credits_reserved)
      VALUES (${projectId}, 'retry_section', ${sql.json(['website', 'social'])},
              ${sql.json({ website: { status: 'running' }, social: { status: 'pending' } })},
              'running', 0)
      RETURNING id`

    await page.goto(`/en/dashboard/projects/${projectId}`)
    await expect(page.getByText(/Website content —/)).toBeVisible()

    const reloaded = await watchForReloads(page)

    /* The run lands a section, and produces something the page can only know
       about by asking the server again. */
    const landed = `Landed ${Date.now() % 100000}`
    await sql`
      UPDATE branding_assets SET slogan = ${landed} WHERE project_id = ${projectId}`
    await sql`
      UPDATE generation_jobs
      SET progress = ${sql.json({ website: { status: 'done' }, social: { status: 'running' } })}
      WHERE id = ${job.id}`

    await expect(page.locator('main').getByText(landed).first()).toBeVisible({ timeout: 25_000 })
    expect(await reloaded(), 'the page was reloaded rather than refreshed').toBe(false)

    /* And the end of the run, which is the other half of the same handler and
       the moment the product is sold on. */
    const finished = `Finished ${Date.now() % 100000}`
    await sql`
      UPDATE branding_assets SET slogan = ${finished} WHERE project_id = ${projectId}`
    await sql`
      UPDATE generation_jobs
      SET status = 'completed',
          progress = ${sql.json({ website: { status: 'done' }, social: { status: 'done' } })}
      WHERE id = ${job.id}`
    await sql`UPDATE projects SET status = 'completed' WHERE id = ${projectId}`

    await expect(page.locator('main').getByText(finished).first()).toBeVisible({ timeout: 25_000 })
    expect(await reloaded(), 'the finished run reloaded the page').toBe(false)
  })

  test('a piece of content finishing appears without a reload', async ({ page }) => {
    const [org] = await sql`
      SELECT organization_id FROM projects WHERE id = ${projectId}`
    const [item] = await sql`
      INSERT INTO content_items
        (id, root_id, organization_id, project_id, type, status, brief, language)
      VALUES (gen_random_uuid(), gen_random_uuid(), ${org.organization_id}, ${projectId},
              'social_post', 'generating', 'Soft update fixture', 'en')
      RETURNING id`

    try {
      await page.goto(`/en/dashboard/projects/${projectId}`)
      await expect(page.getByText('Writing…').first()).toBeVisible()

      const reloaded = await watchForReloads(page)

      await sql`
        UPDATE content_items SET status = 'ready', title = 'Soft update fixture'
        WHERE id = ${item.id}`

      /* The poller runs every five seconds, so this is the one assertion here
         that has to wait for a clock rather than for a stream. */
      await expect(page.getByText('Writing…')).toHaveCount(0, {
        timeout: 25_000,
      })
      expect(await reloaded(), 'the poller reloaded the page').toBe(false)
    } finally {
      await sql`DELETE FROM content_items WHERE id = ${item.id}`
    }
  })

  test('choosing a logo records the choice without a reload', async ({ page }) => {
    // Put the choice back on the table, so there is one to make.
    await sql`
      UPDATE branding_assets SET primary_logo_file_id = NULL WHERE project_id = ${projectId}`

    await page.goto(`/en/dashboard/projects/${projectId}`)
    const reloaded = await watchForReloads(page)

    await page.getByRole('button', { name: 'Use this logo' }).first().click()

    await expect(page.getByRole('button', { name: 'Chosen' }).first()).toBeVisible({
      timeout: 25_000,
    })
    expect(await reloaded(), 'the page was reloaded rather than refreshed').toBe(false)
  })
})
