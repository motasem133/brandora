import { expect, test } from '@playwright/test'

import { firstGeneratedProjectId } from './fixtures/db'

/**
 * Every deliverable is reachable, and none of them silently falls back.
 *
 * This was written against a tab rail: the Assistant tab rendered but could
 * never be selected, because the tab list was mutated after the active tab had
 * been derived from it, so clicking it landed on Branding. Nothing server-side
 * caught it — the page returned 200 either way.
 *
 * The rail is gone; the deliverables are sections of one document now. The bug
 * it guards against is not, so the test asserts the same property against the
 * new shape: everything the run produced is on the page at once, and the
 * assistant — the one surface that still takes the whole stage — opens when it
 * is asked for and shows its own composer rather than the document again.
 */
test.describe('project deliverables', () => {
  let projectId: string

  test.beforeAll(async () => {
    projectId = await firstGeneratedProjectId()
  })

  test('every section the run produced is on the page at once', async ({ page }) => {
    await page.goto(`/en/dashboard/projects/${projectId}`)

    // The identity plate leads, so the brand is named before anything else.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    for (const section of [/Logo concepts/, /Edit website/, /Instagram bio/]) {
      await expect(page.getByText(section).first()).toBeVisible()
    }
  })

  /*
   * The whole point of the door is which brand it opens on. A link to the
   * Studio without the parameter lands on whichever brand happens to be first,
   * which looks like it worked and quietly writes for the wrong company — so
   * this asserts the id travels, not merely that a link exists.
   */
  test('writing for this brand starts on this brand', async ({ page }) => {
    await page.goto(`/en/dashboard/projects/${projectId}`)

    await page.getByRole('link', { name: 'Create content' }).click()

    await expect(page).toHaveURL(new RegExp(`/dashboard/studio\\?brand=${projectId}`))
    await expect(page.getByLabel('Brand')).toHaveValue(projectId)
  })

  test('the assistant opens onto its own stage', async ({ page }) => {
    await page.goto(`/en/dashboard/projects/${projectId}`)

    const assistant = page.getByRole('link', { name: 'Assistant', exact: true })

    // Only paid plans carry it, so its absence is a valid state, not a failure.
    test.skip((await assistant.count()) === 0, 'assistant not available on this plan')

    await assistant.click()
    await expect(page).toHaveURL(/tab=assistant/)
    await expect(page.getByPlaceholder('Ask for a change…')).toBeVisible()

    /*
     * The document must not still be underneath it. Rendering the assistant as
     * one more section at the foot of the page is what made it scroll the whole
     * window down to itself on load, so this asserts the two are exclusive.
     */
    await expect(page.getByText(/Logo concepts/)).toHaveCount(0)
  })
})
