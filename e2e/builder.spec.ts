import { expect, test } from '@playwright/test'

import { firstGeneratedProjectId, sql } from './fixtures/db'

/**
 * The website builder.
 *
 * The most interaction-heavy surface in the product and the least reachable by
 * anything other than a browser: adding a section, selecting it, editing a
 * field and having the change persist all happen client-side.
 */
test.describe('website builder', () => {
  let projectId: string

  /** The fixture's own publish state, put back after the tests that change it. */
  let site: { subdomain: string | null; is_published: boolean }

  test.beforeAll(async () => {
    projectId = await firstGeneratedProjectId()
    const [website] = await sql`
      SELECT id, subdomain, is_published FROM website_assets WHERE project_id = ${projectId}`
    if (!website) throw new Error('The fixture project has no website.')
    site = { subdomain: website.subdomain, is_published: website.is_published }
  })

  test.afterAll(async () => {
    await sql`
      UPDATE website_assets
      SET subdomain = ${site.subdomain}, is_published = ${site.is_published}
      WHERE project_id = ${projectId}`
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(`/en/dashboard/projects/${projectId}/builder`)
    await expect(page.getByTestId('canvas')).toBeVisible()
  })

  test('opens with the page tabs, section library and publish control', async ({ page }) => {
    await expect(page.getByTestId('page-tabs')).toBeVisible()
    await expect(page.getByTestId('block-library')).toBeVisible()
    await expect(page.getByRole('button', { name: /Publish|Update/ }).first()).toBeVisible()
  })

  test('says whose site it is, and offers the way back', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: /Back to brand/ })).toHaveAttribute(
      'href',
      new RegExp(`/dashboard/projects/${projectId}$`),
    )
  })

  test('a section can be selected and edited with the keyboard alone', async ({ page }) => {
    const select = page.getByTestId('canvas-block').first().getByRole('button', { name: /^Select / })
    await select.focus()
    await expect(select).toBeFocused()
    await page.keyboard.press('Enter')

    await expect(select).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('inspector').locator('input, textarea').first()).toBeVisible()
  })

  test('every editing control is reachable on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })

    await page.getByTestId('add-section').click()
    const library = page.getByRole('dialog')
    await expect(library.getByRole('button', { name: /^Paragraph/ })).toBeVisible()
    await page.keyboard.press('Escape')

    await page.getByTestId('canvas-block').first().getByRole('button', { name: /^Select / }).click()
    await page.getByTestId('edit-section').click()
    await expect(page.getByRole('dialog').locator('input, textarea').first()).toBeVisible()
  })

  test('adding a section renders it and autosaves', async ({ page }) => {
    /* The block wrapper, not `<section>`: a section arrives empty now and
       renders as a placeholder saying so until it has copy in it. */
    const sections = page.getByTestId('canvas-block')
    const before = await sections.count()

    await page.getByTestId('block-library').getByRole('button', { name: /^Paragraph/ }).click()

    await expect(sections).toHaveCount(before + 1)
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
      timeout: 20_000,
    })
  })

  test('editing a field updates the canvas and persists', async ({ page }) => {
    // Selection is a control over the section, not the section itself — which
    // is what makes it reachable without a pointer.
    await page.getByTestId('canvas-block').first().getByRole('button', { name: /^Select / }).click()

    const inspector = page.getByTestId('inspector')
    const field = inspector.locator('input, textarea').first()
    await expect(field).toBeVisible()

    const edited = `Playwright ${Date.now()}`
    await field.fill(edited)

    await expect(page.getByTestId('canvas').getByText(edited)).toBeVisible()
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
      timeout: 20_000,
    })

    // Reload to prove it round-tripped rather than only living in memory.
    await page.reload()
    await expect(page.getByTestId('canvas').getByText(edited)).toBeVisible()
  })

  test('switching pages changes the canvas', async ({ page }) => {
    const sections = page.getByTestId('canvas-block')
    const home = await sections.count()

    await page.getByTestId('page-tabs').getByRole('button', { name: 'Contact' }).click()

    await expect(sections).not.toHaveCount(home, { timeout: 10_000 })
  })

  test('a section can be deleted', async ({ page }) => {
    // The controls live on the block wrapper, not inside the rendered section.
    const blocks = page.getByTestId('canvas-block')
    const before = await blocks.count()
    test.skip(before === 0, 'nothing to delete on this page')

    const first = blocks.first()
    await first.hover()
    await first.getByRole('button', { name: /^Delete / }).click()

    await expect(blocks).toHaveCount(before - 1)
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
      timeout: 20_000,
    })
  })

  /*
   * Publishing is what the builder is for, and none of it was covered.
   *
   * Not the address rules, not the confirmation, not unpublishing — the one
   * action in this product that puts a customer's work on the open internet
   * under their client's name. These run against the fixture's own site and put
   * it back the way they found it.
   */
  test('an address under three characters cannot be published', async ({ page }) => {
    await page.getByRole('button', { name: /^(Publish|Update)$/ }).first().click()

    const address = page.getByPlaceholder('my-brand')
    await address.fill('ab')

    await expect(
      page.getByTestId('publish-panel').getByRole('button', { name: /^(Publish|Update)$/ }),
    ).toBeDisabled()
  })

  test('the address is slugified as it is typed', async ({ page }) => {
    await page.getByRole('button', { name: /^(Publish|Update)$/ }).first().click()

    const address = page.getByPlaceholder('my-brand')
    await address.fill('My Brand & Co!')

    await expect(address).toHaveValue('my-brand-co')
  })

  test('publishing asks first, then puts the site online', async ({ page }) => {
    const subdomain = `e2e-publish-${Date.now().toString(36)}`

    await sql`UPDATE website_assets SET is_published = false, subdomain = NULL WHERE project_id = ${projectId}`
    await page.reload()

    await page.getByRole('button', { name: /^Publish$/ }).click()
    await page.getByPlaceholder('my-brand').fill(subdomain)
    await page.getByTestId('publish-panel').getByRole('button', { name: /^Publish$/ }).click()

    // The confirmation is the friction: publishing is public and irreversible
    // in the sense that matters — someone may already have seen it.
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText(subdomain)
    await dialog.getByRole('button', { name: /^Publish$/ }).click()

    await expect(page.getByTestId('online-status')).toContainText(/up to date/i)

    const [row] = await sql`
      SELECT is_published, subdomain, published_pages FROM website_assets WHERE project_id = ${projectId}`
    expect(row.is_published).toBe(true)
    expect(row.subdomain).toBe(subdomain)
    // Publishing is the copy: what visitors get must exist, not be null.
    expect(row.published_pages).not.toBeNull()

    // And the site itself answers, without a session.
    const response = await page.request.get(`/sites/${subdomain}`)
    expect(response.status()).toBe(200)
  })

  test('unpublishing takes it offline again', async ({ page }) => {
    const subdomain = `e2e-unpublish-${Date.now().toString(36)}`
    await sql`
      UPDATE website_assets SET is_published = true, subdomain = ${subdomain}
      WHERE project_id = ${projectId}`
    await page.reload()

    await page.getByRole('button', { name: /^Update$/ }).click()
    await page
      .getByTestId('publish-panel')
      .getByRole('button', { name: /^Take it offline$/ })
      .click()

    // The control itself is the readout: it says Publish again.
    await expect(page.getByRole('button', { name: /^Publish$/ }).first()).toBeVisible()

    const [row] = await sql`SELECT is_published FROM website_assets WHERE project_id = ${projectId}`
    expect(row.is_published).toBe(false)

    const response = await page.request.get(`/sites/${subdomain}`)
    expect(response.status()).toBe(404)
  })

  test('a failed save says so, rather than sitting on "Unsaved changes"', async ({ page }) => {
    /* The failure a customer actually hits is a field over its limit, but the
       point of the test is the *reporting* — so the write is refused at the
       network edge, which is the same path any server refusal takes. */
    await page.route('**/dashboard/projects/**/builder', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 500, body: 'no' })
        return
      }
      await route.continue()
    })

    await page.getByTestId('canvas').getByRole('button').first().click()
    const field = page.getByRole('textbox').first()
    await field.fill('An edit that will not reach the database')

    await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'error', {
      timeout: 10_000,
    })
  })
})

