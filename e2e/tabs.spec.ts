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

    for (const section of [/Logo concepts/, /Edit your website/, /Instagram bio/]) {
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

    /*
     * More than one option, asserted before the value.
     *
     * The picker hides itself below two brands — one option is not a choice —
     * and the fixture account had exactly one, so in CI this control was simply
     * not on the page while it was on every developer's machine. That is what
     * kept the suite red for a week.
     *
     * It is also what the assertion below needs to mean anything: the Studio
     * resolves the parameter with `find(...) ?? brands[0]`, so against a single
     * brand a broken lookup returns the right project anyway. If the fixtures
     * ever shrink back to one brand, this line says so instead of the next one
     * failing on a missing element.
     */
    const picker = page.getByLabel('Brand')
    await expect(picker).toBeVisible()
    expect(await picker.locator('option').count()).toBeGreaterThan(1)
    await expect(picker).toHaveValue(projectId)
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
