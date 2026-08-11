import 'dotenv/config'
import postgres from 'postgres'

/**
 * Deletes workspaces that no longer belong to anyone and hold nothing.
 *
 * Signing up creates a personal organization, and an organization has no
 * foreign key to the person who owns it — so deleting a test user cascaded the
 * membership and left the workspace standing. `system-test.mjs` did that on
 * every run, and its flood test signs up until it is refused, so by 12 August
 * 236 abandoned workspaces had accumulated: 168 Flood, 62 Intruder, and a
 * handful of others. Each carries a free credit grant, in the same ledger the
 * margin screens read.
 *
 * The suite takes its workspaces with it now, so this is a one-off broom rather
 * than a habit. It is kept because the state it clears is easy to recreate by
 * hand — any interrupted fixture run leaves one — and because a delete this
 * broad should be something reviewable rather than something typed at a prompt.
 *
 * The guards are the point. It refuses to touch a workspace that has a member,
 * a project, a piece of content, an order or a subscription: anything anybody
 * could want back, or that money has passed through. What survives all five is
 * a name and a credit grant nobody can reach.
 *
 * Usage: `node scripts/sweep-fixture-orgs.mjs` lists what it would delete.
 *        `node scripts/sweep-fixture-orgs.mjs --delete` does it.
 */

const sql = postgres(process.env.DATABASE_URL, { max: 2 })
const commit = process.argv.includes('--delete')

const ABANDONED = sql`
  NOT EXISTS (SELECT 1 FROM members m WHERE m.organization_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.organization_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM content_items c WHERE c.organization_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM orders r WHERE r.organization_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.organization_id = o.id)`

const doomed = await sql`
  SELECT o.id, o.name, o.credit_balance, o.created_at
  FROM organizations o WHERE ${ABANDONED}
  ORDER BY o.created_at`

/* Named rather than counted: a sweep that reports "236 rows" tells you nothing
   about whether it was about to delete the right ones. */
const byName = doomed.reduce((tally, row) => {
  tally[row.name] = (tally[row.name] ?? 0) + 1
  return tally
}, {})

for (const [name, count] of Object.entries(byName).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${name}`)
}

const held = await sql`
  SELECT count(*)::int AS c FROM organizations o
  WHERE NOT EXISTS (SELECT 1 FROM members m WHERE m.organization_id = o.id)
    AND NOT (${ABANDONED})`

console.log(`\n${doomed.length} abandoned workspace(s).`)
if (held[0].c) {
  console.log(`${held[0].c} more have no member but hold something, and are left alone.`)
}

if (!commit) {
  console.log('\nNothing deleted. Pass --delete to do it.')
  await sql.end()
  process.exit(0)
}

const gone = await sql`DELETE FROM organizations o WHERE ${ABANDONED} RETURNING o.id`
const [{ c: orphans }] = await sql`
  SELECT count(*)::int AS c FROM credit_transactions ct
  LEFT JOIN organizations o ON o.id = ct.organization_id WHERE o.id IS NULL`

console.log(`\nDeleted ${gone.length}. Orphaned credit transactions: ${orphans}.`)

await sql.end()
