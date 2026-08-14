import 'dotenv/config'

import assert from 'node:assert/strict'
import { inArray } from 'drizzle-orm'

import { db } from '../src/server/db'
import { generatedFiles, members, projects } from '../src/server/db/schema'
import { iconKeyForLogo } from '../src/server/services/logos'

/**
 * Which concept a favicon and an avatar get cut from.
 *
 * A round produces two concepts for two jobs: the wordmark goes on a header,
 * the icon is the one that survives being shrunk. Every derived square was
 * being cut from whichever concept was chosen as the logo — the wordmark, on a
 * fresh run — so the product shipped a wordmark squeezed into 32 pixels as the
 * favicon of every published site.
 *
 * These are the rules a future change would break quietly, because picking the
 * wrong concept fails no build and throws no error: it just produces a worse
 * icon that nobody looks at closely.
 *
 * Two scratch projects, not one. Rows written before rounds existed carry no
 * round number and group as round 1 — so a project holding both legacy rows and
 * explicit round-1 rows has two icons in the same round, and which one wins is
 * arbitrary rather than contractual. A real project has one shape or the other,
 * and testing them together asserts a coincidence.
 *
 * Needs a database. Usage: pnpm test:logo-icon
 */

async function main() {
  const [member] = await db
    .select({ organizationId: members.organizationId, userId: members.userId })
    .from(members)
    .limit(1)

  assert.ok(member, 'no organization in this database — run pnpm db:seed first')

  const scratchIds: string[] = []

  async function scratchProject(title: string) {
    const [project] = await db
      .insert(projects)
      .values({
        organizationId: member.organizationId,
        createdBy: member.userId,
        title,
        industry: 'Testing',
        country: 'Testland',
        brandStyle: 'minimal',
        brandBrief: 'A scratch project for the icon-selection contract.',
      })
      .returning({ id: projects.id })

    scratchIds.push(project.id)
    return project.id
  }

  /** One concept row, as the pipeline writes them. */
  const concept = (projectId: string, name: string, style: string, round: number | null) => ({
    projectId,
    kind: 'logo_raster' as const,
    r2Key: `scratch/${projectId}/${name}.png`,
    mimeType: 'image/png',
    /* A row written before rounds existed carries no round key at all, which is
       a different thing from carrying zero. */
    metadata: round === null ? { style } : { style, round },
  })

  try {
    /* ---------- A project with two rounds ---------- */
    const rounded = await scratchProject('logo-icon-test rounds')
    const key = (name: string) => `scratch/${rounded}/${name}.png`

    await db.insert(generatedFiles).values([
      concept(rounded, 'r1-wordmark', 'wordmark', 1),
      concept(rounded, 'r1-icon', 'abstract geometric icon', 1),
      // A round whose icon failed to generate: the wordmark is all there is.
      concept(rounded, 'r2-wordmark', 'wordmark', 2),
    ])

    // 1. The point of the change: a chosen wordmark hands the squares to its
    //    own round's icon.
    assert.equal(
      await iconKeyForLogo(rounded, key('r1-wordmark')),
      key('r1-icon'),
      'a chosen wordmark should cut its favicon from the icon concept beside it',
    )

    // 2. Already the icon — there is nothing to swap to, and saying otherwise
    //    would make the caller read a second copy of the same object.
    assert.equal(
      await iconKeyForLogo(rounded, key('r1-icon')),
      null,
      'a chosen icon needs no substitute',
    )

    // 3. The coherence rule, and the assertion most likely to be broken later
    //    by a "helpful" widening of the search. Round 2 has no icon, and round
    //    1's icon belongs to a different idea — falling back to the chosen
    //    lockup is correct; borrowing across rounds would pair artwork that was
    //    never meant to agree.
    assert.equal(
      await iconKeyForLogo(rounded, key('r2-wordmark')),
      null,
      'a round without an icon must fall back, never borrow another round’s',
    )

    // 4. A key that belongs to no concept resolves to nothing rather than
    //    guessing — a stale reference must not silently repoint the favicon.
    assert.equal(
      await iconKeyForLogo(rounded, key('does-not-exist')),
      null,
      'an unknown logo key should resolve to nothing',
    )

    /* ---------- A brand from before the styles narrowed to two ---------- */
    const legacyStyles = await scratchProject('logo-icon-test legacy styles')
    const oldKey = (name: string) => `scratch/${legacyStyles}/${name}.png`

    await db.insert(generatedFiles).values([
      concept(legacyStyles, 'wordmark', 'wordmark', 1),
      concept(legacyStyles, 'icon', 'abstract geometric icon', 1),
      concept(legacyStyles, 'monogram', 'lettermark monogram', 1),
      concept(legacyStyles, 'emblem', 'emblem badge', 1),
    ])

    /*
     * 6 and 7 are the rule this test exists to pin, and they were found by
     * looking at production rather than by reasoning: three live brands had
     * chosen a monogram or an emblem. Those are already compact marks that
     * shrink cleanly, and a rule phrased as "anything that is not the icon"
     * would have replaced a mark those customers deliberately chose with one
     * they did not — on the favicon of a site that is already published.
     */
    assert.equal(
      await iconKeyForLogo(legacyStyles, oldKey('monogram')),
      null,
      'a chosen lettermark monogram is already an icon — leave it alone',
    )
    assert.equal(
      await iconKeyForLogo(legacyStyles, oldKey('emblem')),
      null,
      'a chosen emblem badge is already an icon — leave it alone',
    )
    // The wordmark in that same round is still rescued.
    assert.equal(
      await iconKeyForLogo(legacyStyles, oldKey('wordmark')),
      oldKey('icon'),
      'the wordmark is the one concept that actually fails at 32px',
    )

    /* ---------- A project from before rounds existed ---------- */
    const legacy = await scratchProject('logo-icon-test legacy')
    const legacyKey = (name: string) => `scratch/${legacy}/${name}.png`

    await db.insert(generatedFiles).values([
      concept(legacy, 'wordmark', 'wordmark', null),
      concept(legacy, 'icon', 'abstract geometric icon', null),
    ])

    // 5. Projects generated before rounds existed get the improvement too.
    assert.equal(
      await iconKeyForLogo(legacy, legacyKey('wordmark')),
      legacyKey('icon'),
      'concepts with no round number group as round 1 and should pair',
    )

    console.log(
      '✓ icon selection: prefers the round’s icon, never crosses rounds, falls back cleanly',
    )
  } finally {
    // Cascades to the concept rows.
    if (scratchIds.length) {
      await db.delete(projects).where(inArray(projects.id, scratchIds))
    }
  }
}

/*
 * The exit is here rather than in the `finally` above, and that is not a style
 * preference. `process.exit(0)` inside a finally block runs *before* a rejected
 * assertion is ever reported — so a failing contract exits zero printing
 * nothing, which is the one thing a test must never do. The process still has
 * to be ended explicitly, because postgres.js keeps it alive otherwise.
 */
main().then(
  () => process.exit(0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
