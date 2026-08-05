import 'server-only'

import { sql } from 'drizzle-orm'

import { db } from '@/server/db'

/**
 * Weekly series for the overview's stat tiles.
 *
 * Every figure here is measured from a real timestamp. That constraint is what
 * decided which four metrics exist: `projects` has a `created_at`,
 * `generation_jobs` has a `finished_at`, and the credit ledger is append-only
 * with a `balance_after` snapshot on every row — so "brands started", "runs
 * finished", "credits spent" and the running balance can all be bucketed by
 * week without inventing anything.
 *
 * What is deliberately absent is "brands finished". A project's completion is a
 * column of current state with no timestamp beside it, so a weekly series of it
 * would really be a series of *creation* dates filtered by *today's* status —
 * a number that changes retroactively every time an old project completes.
 * Runs finished is the honest version of the same question.
 */

const WEEKS = 12

export type Series = {
  /** One value per week, oldest first, `WEEKS` long. */
  points: number[]
  /** The headline: a total, or a level for the balance. */
  value: number
  /**
   * Change across the last half of the window against the half before it, as a
   * fraction. `null` where there is no prior half to compare against — a new
   * account's first month has nothing to be up or down against, and "+100%"
   * from a base of zero is a sentence with no meaning.
   */
  delta: number | null
}

type Bucket = { week: string; value: number }

/** Monday-anchored week starts, oldest first, matching `date_trunc('week')`. */
function weekKeys(now: Date) {
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
  // getUTCDay is 0 on Sunday; date_trunc('week') anchors on Monday.
  const back = (monday.getUTCDay() + 6) % 7
  monday.setUTCDate(monday.getUTCDate() - back)

  return Array.from({ length: WEEKS }, (_, i) => {
    const d = new Date(monday)
    d.setUTCDate(d.getUTCDate() - (WEEKS - 1 - i) * 7)
    return d.toISOString().slice(0, 10)
  })
}

function toSeries(
  keys: string[],
  rows: Bucket[],
  opts: { carry?: boolean; seed?: number } = {},
): Series {
  const byWeek = new Map(rows.map((r) => [r.week, Number(r.value)]))

  // A carried series has to start from where the account already stood, not
  // from zero: an org that spent nothing in the first weeks of the window would
  // otherwise draw a balance climbing out of nothing it never had.
  let last = opts.seed ?? 0
  const points = keys.map((k) => {
    const hit = byWeek.get(k)
    if (hit !== undefined) last = hit
    // A balance carries forward through a quiet week; a count does not.
    return hit !== undefined ? hit : opts.carry ? last : 0
  })

  const half = Math.floor(WEEKS / 2)
  const recent = points.slice(half)
  const prior = points.slice(0, half)

  let value: number
  let delta: number | null

  if (opts.carry) {
    /*
     * A level, not a rate. The headline is where it stands now, and there is
     * deliberately no delta.
     *
     * A percentage change on a balance is close to meaningless: it is measured
     * against whatever the account happened to hold at an arbitrary earlier
     * point, so an account that topped up from 36 to 494 reads "+1,272%",
     * which is arithmetically true and tells nobody anything. The sparkline
     * already shows the shape, which is the part worth seeing.
     */
    value = points[points.length - 1] ?? 0
    delta = null
  } else {
    value = points.reduce((a, b) => a + b, 0)
    const a = recent.reduce((x, y) => x + y, 0)
    const b = prior.reduce((x, y) => x + y, 0)
    delta = b > 0 ? (a - b) / b : null
  }

  return { points, value, delta }
}

export async function dashboardTrends(organizationId: string) {
  const keys = weekKeys(new Date())
  const since = keys[0]

  const [started, finished, spent, balance, opening] = await Promise.all([
    db.execute<Bucket>(sql`
      SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS week,
             count(*)::int AS value
      FROM projects
      WHERE organization_id = ${organizationId}
        AND deleted_at IS NULL
        AND created_at >= ${since}::date
      GROUP BY 1
    `),

    db.execute<Bucket>(sql`
      SELECT to_char(date_trunc('week', j.finished_at), 'YYYY-MM-DD') AS week,
             count(*)::int AS value
      FROM generation_jobs j
      JOIN projects p ON p.id = j.project_id
      WHERE p.organization_id = ${organizationId}
        AND j.status = 'completed'
        AND j.finished_at >= ${since}::date
      GROUP BY 1
    `),

    db.execute<Bucket>(sql`
      SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS week,
             sum(-amount)::int AS value
      FROM credit_transactions
      WHERE organization_id = ${organizationId}
        AND amount < 0
        AND created_at >= ${since}::date
      GROUP BY 1
    `),

    /*
     * The last balance snapshot in each week. DISTINCT ON takes the first row
     * per group, so the ordering inside the group is what picks it — hence the
     * descending `created_at`.
     */
    db.execute<Bucket>(sql`
      SELECT DISTINCT ON (date_trunc('week', created_at))
             to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS week,
             balance_after AS value
      FROM credit_transactions
      WHERE organization_id = ${organizationId}
        AND created_at >= ${since}::date
      ORDER BY date_trunc('week', created_at), created_at DESC
    `),

    /* Where the balance already stood when the window opened. */
    db.execute<{ value: number }>(sql`
      SELECT balance_after AS value
      FROM credit_transactions
      WHERE organization_id = ${organizationId}
        AND created_at < ${since}::date
      ORDER BY created_at DESC
      LIMIT 1
    `),
  ])

  return {
    weeks: keys,
    started: toSeries(keys, started),
    finished: toSeries(keys, finished),
    spent: toSeries(keys, spent),
    balance: toSeries(keys, balance, {
      carry: true,
      seed: Number(opening[0]?.value ?? 0),
    }),
  }
}
