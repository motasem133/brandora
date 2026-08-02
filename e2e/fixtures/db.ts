import 'dotenv/config'
import postgres from 'postgres'

/**
 * Direct database access for arranging states the UI cannot reach quickly —
 * a generation already in flight, for instance. Assertions still go through
 * the browser; this only sets the stage.
 */
export const sql = postgres(process.env.DATABASE_URL!, { max: 2 })

export async function firstGeneratedProjectId(): Promise<string> {
  const [row] = await sql`
    SELECT p.id FROM projects p
    JOIN branding_assets b ON b.project_id = p.id
    WHERE p.deleted_at IS NULL
    ORDER BY p.created_at
    LIMIT 1`

  if (!row) throw new Error('No generated project to test against. Run a generation first.')
  return row.id as string
}

/** Inserts a job that looks in-flight without spending credits or calling a model. */
export async function startFakeJob(projectId: string, sections: string[] = ['logos']) {
  const progress = Object.fromEntries(sections.map((s) => [s, { status: 'running' }]))
  const [job] = await sql`
    INSERT INTO generation_jobs (project_id, trigger, sections, progress, status, credits_reserved)
    VALUES (${projectId}, 'retry_section', ${sql.json(sections)}, ${sql.json(progress)}, 'running', 0)
    RETURNING id`
  return job.id as string
}

export async function clearFakeJobs() {
  await sql`DELETE FROM generation_jobs WHERE credits_reserved = 0`
}
