import 'dotenv/config'

import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'

import { db } from '../src/server/db'
import { generationJobs, projects } from '../src/server/db/schema'
import { noteLogoConcept } from '../src/server/services/generation'

/**
 * The concept counter, driven the way the pipeline drives it: all at once.
 *
 * Logo concepts are generated concurrently, so every one of them calls this at
 * roughly the same moment. A read-modify-write would lose all but the last —
 * silently, and only under load, which is the worst way for a progress figure
 * to be wrong: the page would stop revealing concepts it had actually drawn.
 *
 * This is the same failure `markStep` was rewritten as one jsonb statement to
 * avoid, verified then with three concurrent writers. Same test, same reason.
 *
 * Needs a database. Usage: pnpm test:logo-progress
 */

async function main() {
  const CONCURRENT = 8

  const [project] = await db.select({ id: projects.id }).from(projects).limit(1)
  assert.ok(project, 'no project in this database — run pnpm db:seed and the fixtures first')

  const [job] = await db
    .insert(generationJobs)
    .values({
      projectId: project.id,
      trigger: 'retry_section',
      sections: ['logos'],
      progress: { logos: { status: 'running', startedAt: new Date().toISOString() } },
      status: 'running',
      creditsReserved: 0,
    })
    .returning({ id: generationJobs.id })

  try {
    await Promise.all(Array.from({ length: CONCURRENT }, () => noteLogoConcept(job.id)))

    const [row] = await db
      .select({ progress: generationJobs.progress })
      .from(generationJobs)
      .where(eq(generationJobs.id, job.id))
      .limit(1)

    const logos = (row.progress as Record<string, { status?: string; concepts?: number }>).logos

    assert.equal(logos?.concepts, CONCURRENT, `${CONCURRENT} concurrent writers should count ${CONCURRENT}`)
    /* The merge must not flatten what the step already had. */
    assert.equal(logos?.status, 'running', 'the counter overwrote the step status')

    console.log(`✓ ${CONCURRENT} concurrent writers counted ${logos?.concepts}, status survived`)
  } finally {
    await db.delete(generationJobs).where(eq(generationJobs.id, job.id))
    process.exit(0)
  }
}

main()
