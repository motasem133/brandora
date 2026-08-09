import { expect, test } from '@playwright/test'

import { firstGeneratedProjectId, sql } from './fixtures/db'

/**
 * Credits held for a run that never happened must come back on their own.
 *
 * This is the incident this sweeper was moved out of Inngest for: with no
 * Inngest app synced to production, two customers' runs sat at `queued`, and
 * the cron that would have refunded them was itself an Inngest function, so it
 * never ran either. The money stayed taken and nothing in the product could
 * notice.
 *
 * The refund path is worth a real test rather than a reading, because every
 * part of it is arithmetic on someone's balance.
 */
test.describe('stuck holds', () => {
  let projectId: string
  let organizationId: string
  let jobId: string

  const HELD = 7

  test.beforeAll(async () => {
    projectId = await firstGeneratedProjectId()
    const [row] = await sql`SELECT organization_id FROM projects WHERE id = ${projectId}`
    organizationId = row.organization_id as string
  })

  test.afterEach(async () => {
    if (jobId) {
      await sql`DELETE FROM credit_transactions WHERE generation_job_id = ${jobId}`
      await sql`DELETE FROM generation_jobs WHERE id = ${jobId}`
    }
    await sql`UPDATE projects SET status = 'completed' WHERE id = ${projectId}`
  })

  test('a run that never started gets its credits back', async ({ request }) => {
    const [before] = await sql`
      SELECT credit_balance FROM organizations WHERE id = ${organizationId}`
    const opening = before.credit_balance as number

    /*
     * Exactly the state `startGeneration` leaves behind when the event is
     * accepted and no worker ever collects it: a queued job, a reservation on
     * the ledger, and a project that reads as busy. Twenty minutes old, which
     * is past the ten-minute mark for a job that never started.
     */
    const [job] = await sql`
      INSERT INTO generation_jobs (project_id, trigger, sections, progress, status,
                                   credits_reserved, created_at)
      VALUES (${projectId}, 'initial', ${sql.json(['branding', 'logos'])},
              ${sql.json({ branding: { status: 'pending' }, logos: { status: 'pending' } })},
              'queued', ${HELD}, now() - interval '20 minutes')
      RETURNING id`
    jobId = job.id as string

    await sql`
      INSERT INTO credit_transactions (organization_id, amount, balance_after, reason,
                                       project_id, generation_job_id, idempotency_key, metadata)
      VALUES (${organizationId}, ${-HELD}, ${opening - HELD}, 'generation', ${projectId},
              ${jobId}, ${'reserve:' + jobId}, ${sql.json({ kind: 'reservation' })})`
    await sql`
      UPDATE organizations SET credit_balance = ${opening - HELD} WHERE id = ${organizationId}`
    await sql`UPDATE projects SET status = 'queued' WHERE id = ${projectId}`

    const response = await request.get('/api/cron/release-holds')
    expect(response.ok()).toBeTruthy()

    const [after] = await sql`
      SELECT credit_balance FROM organizations WHERE id = ${organizationId}`
    expect(after.credit_balance).toBe(opening)

    const [settled] = await sql`SELECT status, credits_charged FROM generation_jobs WHERE id = ${jobId}`
    expect(settled.status).toBe('failed')
    expect(settled.credits_charged).toBe(0)

    // The project has to stop reading as busy, or the customer still cannot
    // press the button again — which was half of what made the incident bite.
    const [project] = await sql`SELECT status FROM projects WHERE id = ${projectId}`
    expect(project.status).toBe('failed')
  })

  test('a run that is merely young is left alone', async ({ request }) => {
    const [before] = await sql`
      SELECT credit_balance FROM organizations WHERE id = ${organizationId}`
    const opening = before.credit_balance as number

    const [job] = await sql`
      INSERT INTO generation_jobs (project_id, trigger, sections, progress, status,
                                   credits_reserved, created_at)
      VALUES (${projectId}, 'initial', ${sql.json(['branding'])},
              ${sql.json({ branding: { status: 'pending' } })}, 'queued', ${HELD}, now())
      RETURNING id`
    jobId = job.id as string

    await request.get('/api/cron/release-holds')

    const [settled] = await sql`SELECT status FROM generation_jobs WHERE id = ${jobId}`
    expect(settled.status).toBe('queued')

    const [after] = await sql`
      SELECT credit_balance FROM organizations WHERE id = ${organizationId}`
    expect(after.credit_balance).toBe(opening)
  })
})
