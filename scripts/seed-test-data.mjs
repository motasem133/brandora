import 'dotenv/config'
import postgres from 'postgres'

/**
 * Deterministic fixtures for the test suites.
 *
 * Both suites need a brand that already exists — a project with branding, a
 * published site, generated files, an assistant thread. Until now that data
 * only existed because of manual testing, so the suites passed on this machine
 * and would have failed anywhere else, including CI.
 *
 * Requires the app to be running: the account is created through the real
 * sign-up endpoint so Better Auth owns the password hashing, rather than
 * writing a credential hash directly.
 *
 * Usage: node scripts/seed-test-data.mjs
 */

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3100'

/*
 * Better Auth refuses a request whose Origin is not the app's own baseURL, so
 * the header must be what the server was configured with rather than wherever
 * it happens to be reachable. The two differ whenever a build is served on a
 * different port than it was configured for.
 */
const ORIGIN = process.env.BETTER_AUTH_URL ?? BASE
const EMAIL = process.env.E2E_EMAIL ?? 'e2e@brandora-test.com'
const PASSWORD = process.env.E2E_PASSWORD ?? 'testpassword123'

const sql = postgres(process.env.DATABASE_URL, { max: 2 })

async function ensureAccount() {
  // Rate limiting is per window and would refuse a repeated seed run.
  await sql`DELETE FROM rate_limits WHERE key LIKE '%/sign-up/email'`

  const existing = await sql`SELECT id FROM users WHERE email = ${EMAIL}`
  if (existing.length > 0) return existing[0].id

  const response = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ name: 'E2E Fixture', email: EMAIL, password: PASSWORD, locale: 'en' }),
  })

  if (!response.ok) {
    throw new Error(`sign-up failed (${response.status}): ${(await response.text()).slice(0, 200)}`)
  }

  const [user] = await sql`SELECT id FROM users WHERE email = ${EMAIL}`
  if (!user) throw new Error('sign-up succeeded but no user row appeared')
  return user.id
}

async function main() {
  console.info(`Seeding fixtures against ${BASE}…`)

  const userId = await ensureAccount()
  await sql`UPDATE users SET email_verified = true WHERE id = ${userId}`

  const [org] = await sql`
    SELECT o.* FROM organizations o
    JOIN members m ON m.organization_id = o.id
    WHERE m.user_id = ${userId}
    ORDER BY o.created_at
    LIMIT 1`

  if (!org) throw new Error('the fixture user has no organization')

  // Pro, so the assistant and website features are unlocked for the UI tests.
  const [pro] = await sql`SELECT id FROM plans WHERE slug = 'pro'`
  await sql`
    INSERT INTO subscriptions (organization_id, plan_id, polar_subscription_id, status,
                               current_period_start, current_period_end)
    VALUES (${org.id}, ${pro.id}, ${'fixture-' + org.id}, 'active', now(), now() + interval '30 days')
    ON CONFLICT (polar_subscription_id) DO UPDATE SET status = 'active'`

  /*
   * Through the ledger, not straight onto the balance.
   *
   * The ledger is the source of truth and the suites assert that the cached
   * balance equals the sum of transactions. Setting the balance directly is the
   * exact flaw that was fixed in organization creation, and a fixture that
   * repeats it fails the invariant it is meant to support.
   */
  const [grant] = await sql`
    SELECT id FROM credit_transactions WHERE idempotency_key = ${'fixture-credits:' + org.id}`

  if (!grant) {
    const topUp = 500 - org.credit_balance
    if (topUp !== 0) {
      await sql`
        INSERT INTO credit_transactions (organization_id, amount, balance_after, reason,
                                         idempotency_key, metadata)
        VALUES (${org.id}, ${topUp}, 500, 'admin_adjustment',
                ${'fixture-credits:' + org.id}, ${sql.json({ kind: 'test_fixture' })})`
      await sql`UPDATE organizations SET credit_balance = 500 WHERE id = ${org.id}`
    }
  }

  /*
   * Looked up before inserting rather than relying on ON CONFLICT: there is no
   * unique constraint on a project's title, so a conflict clause matches
   * nothing and every run would create another project — which then collides on
   * the published subdomain.
   */
  const existingProject = await sql`
    SELECT id FROM projects
    WHERE organization_id = ${org.id} AND title = 'E2E Fixture Brand' AND deleted_at IS NULL
    LIMIT 1`

  const [project] = existingProject.length
    ? existingProject
    : await sql`
        INSERT INTO projects (organization_id, created_by, title, business_name, industry, country,
                              brand_brief, brand_style, preferred_colors, needs_website,
                              needs_social_media, language, status)
        VALUES (${org.id}, ${userId}, 'E2E Fixture Brand', 'Fixture Co', 'Technology',
                'United Arab Emirates',
                'Teams who need a brand identity generated and refined quickly',
                'modern', ${sql.json(['#7c3aed', '#06b6d4'])}, true, true, 'en', 'completed')
        RETURNING id`

  const projectId = project.id

  await sql`
    INSERT INTO branding_assets (project_id, business_name_ideas, slogan, brand_story,
                                 color_palette, font_recommendations, brand_values, brand_voice,
                                 model_used, prompt_version)
    VALUES (${projectId},
            ${sql.json([
              { name: 'Fixture Co', rationale: 'Plain and memorable.' },
              { name: 'Northwind', rationale: 'Suggests momentum.' },
              { name: 'Lumen', rationale: 'Light, clarity, focus.' },
              { name: 'Arbor', rationale: 'Growth and structure.' },
              { name: 'Kestrel', rationale: 'Precision and speed.' },
            ])},
            'Built to be understood.',
            ${'Fixture Co exists so that tests have something real to assert against.\n\nIt sells clarity to teams who have run out of patience for vague branding.'},
            ${sql.json({ primary: '#7c3aed', secondary: '#06b6d4', accent: '#111827', background: '#F9FAFB', text: '#1F2937' })},
            ${sql.json({ heading: 'Syne', body: 'Inter' })},
            ${sql.json(['Clarity', 'Speed', 'Craft'])},
            'Direct, warm, never breathless.',
            'fixture', 'fixture@v1')
    ON CONFLICT (project_id) DO NOTHING`

  await sql`
    INSERT INTO website_assets (project_id, template, pages, custom_styles, is_published,
                                subdomain, published_at)
    VALUES (${projectId}, 'modern',
            ${sql.json({
              home: [
                { type: 'hero', title: 'Built to be understood', subtitle: 'Clarity for teams who have run out of patience.', cta: 'Get started' },
                { type: 'features', heading: 'What you get', items: [
                  { title: 'A name', body: 'Chosen, not guessed at.' },
                  { title: 'A look', body: 'Colours and type that agree with each other.' },
                  { title: 'A voice', body: 'Words that sound like one company.' },
                ] },
                { type: 'cta', heading: 'Ready?', body: 'It takes about a minute.', cta: 'Start now' },
              ],
              about: [{ type: 'richText', heading: 'About', body: 'A fixture brand used by the automated tests.' }],
              services: [{ type: 'services', heading: 'Services', services: [
                { title: 'Identity', body: 'Names, palette, type.' },
                { title: 'Website', body: 'Pages you can edit.' },
              ] }],
              contact: [{ type: 'contact', heading: 'Get in touch', body: 'We reply quickly.', email: 'hello@fixture.test' }],
            })},
            ${sql.json({})}, true, 'e2e-fixture', now())
    ON CONFLICT (project_id) DO UPDATE SET is_published = true, subdomain = 'e2e-fixture'`

  await sql`
    INSERT INTO social_media_assets (project_id, instagram_bio, instagram_posts, story_templates,
                                     ad_copy, hashtags)
    VALUES (${projectId}, 'Built to be understood. Clarity for teams.',
            ${sql.json(
              Array.from({ length: 9 }, (_, i) => ({
                type: ['introduction', 'product', 'testimonial'][i % 3],
                caption: `Fixture post ${i + 1}. Something concrete rather than impressive.`,
                hashtags: ['branding', 'design', 'startup'],
              })),
            )},
            ${sql.json([{ title: 'Behind the scenes', body: 'How the brand came together.' }])},
            ${sql.json({ headline: 'Built to be understood', body: 'Clarity, fast.', cta: 'Start', facebookAd: 'Clarity, fast.', googleAd: 'Brand identity in a minute' })},
            ${sql.json(['branding', 'design', 'startup', 'identity', 'logo', 'typography', 'colour', 'brandvoice', 'marketing', 'smallbusiness'])})
    ON CONFLICT (project_id) DO NOTHING`

  // A file row is enough for the authorisation tests; no bytes are ever fetched.
  const existingFile = await sql`
    SELECT id FROM generated_files WHERE project_id = ${projectId} AND kind = 'logo_raster' LIMIT 1`

  if (existingFile.length === 0) {
    await sql`
      INSERT INTO generated_files (project_id, kind, r2_key, mime_type, size_bytes, width, height, metadata)
      VALUES (${projectId}, 'logo_raster', ${`projects/${projectId}/logo-wordmark.png`},
              'image/png', 1024, 1024, 1024, ${sql.json({ style: 'wordmark' })})`
  }

  const existingThread = await sql`
    SELECT id FROM assistant_threads WHERE project_id = ${projectId} LIMIT 1`

  const [thread] = existingThread.length
    ? existingThread
    : await sql`
        INSERT INTO assistant_threads (project_id, title, created_by)
        VALUES (${projectId}, 'Brand refinement', ${userId})
        RETURNING id`

  const existingMessages = await sql`SELECT id FROM assistant_messages WHERE thread_id = ${thread.id}`
  if (existingMessages.length === 0) {
    await sql`
      INSERT INTO assistant_messages (thread_id, role, content, model) VALUES
        (${thread.id}, 'user', 'Make the slogan shorter.', null),
        (${thread.id}, 'assistant', 'Done — the slogan is now "Built to be understood."', 'fixture')`
  }

  console.info(`  project   ${projectId}`)
  console.info(`  org       ${org.id}`)
  console.info(`  account   ${EMAIL} / ${PASSWORD}`)
  console.info('Done.')
}

main()
  .catch((error) => {
    console.error('Fixture seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await sql.end()
  })
