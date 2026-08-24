import 'dotenv/config'

import { and, eq, sql } from 'drizzle-orm'

import { db } from '../src/server/db'
import { generatedFiles, projects } from '../src/server/db/schema'
import { kitPostsOf } from '../src/server/services/social-kit'

/**
 * A kit rebuild must not take a customer's carousels with it.
 *
 * Both are stored as `social_post`. The kit's delete was scoped by kind alone,
 * so every rerun destroyed the frames of every carousel and story the project
 * had — `content_items` rows survived pointing at ids that no longer existed,
 * and the library drew broken thumbnails. One project in the local database
 * lost a carousel to a kit rerun seven minutes after it was made.
 *
 * Against the real database, because the thing being tested is a predicate on
 * a JSON column and the only way to be sure of one is to run it. Both rows are
 * inserted and removed here; nothing else is touched.
 *
 * Run: pnpm test:kit-scope
 */

async function main() {
  const [project] = await db.select({ id: projects.id }).from(projects).limit(1)
  if (!project) throw new Error('No project to test against. Run: pnpm db:seed')

  const rows = await db
    .insert(generatedFiles)
    .values([
      {
        projectId: project.id,
        kind: 'social_post' as const,
        r2Key: 'scope-test/kit-post.png',
        mimeType: 'image/png',
        metadata: { layout: 'statement', label: 'Statement' },
      },
      {
        projectId: project.id,
        kind: 'social_post' as const,
        r2Key: 'scope-test/carousel-frame.png',
        mimeType: 'image/png',
        metadata: { layout: 'statement', label: 'Statement', contentItemId: 'scope-test-item' },
      },
    ])
    .returning({ id: generatedFiles.id, key: generatedFiles.r2Key })

  const kitRow = rows.find((row) => row.key.endsWith('kit-post.png'))!
  const frameRow = rows.find((row) => row.key.endsWith('carousel-frame.png'))!

  try {
    const selected = await db
      .select({ id: generatedFiles.id })
      .from(generatedFiles)
      .where(and(kitPostsOf(project.id), sql`${generatedFiles.r2Key} LIKE 'scope-test/%'`))

    const ids = selected.map((row) => row.id)
    const failures: string[] = []

    if (!ids.includes(kitRow.id)) failures.push('the kit post was not matched — a rebuild would leave a stale post behind')
    if (ids.includes(frameRow.id)) failures.push("a carousel's frame was matched — a kit rebuild would delete it")

    if (failures.length) {
      for (const failure of failures) console.error(`  ✗ ${failure}`)
      process.exitCode = 1
      return
    }

    console.log('✓ a kit rebuild claims its own posts and leaves content frames alone')
  } finally {
    await db.delete(generatedFiles).where(eq(generatedFiles.id, kitRow.id))
    await db.delete(generatedFiles).where(eq(generatedFiles.id, frameRow.id))
  }
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
