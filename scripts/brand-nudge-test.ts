import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'

config()

/*
 * No test sends a real email.
 *
 * A working Resend key is normally present in `.env`, and this script exercises
 * the send path — so without this it would deliver reminders to the addresses
 * the fixtures invent and bounce them off a domain that does not exist. Bounces
 * are charged against a sending domain's reputation, so this is not merely
 * untidy.
 *
 * Everything that reads the environment is imported inside `main` for this one
 * reason. `@/lib/env` validates and *captures* `process.env` when it loads, so
 * deleting a variable afterwards changes nothing — and every `import` in a
 * module is hoisted above the statements between them, so a static import of
 * the database here would pull `env` in before this line ever ran. Loaded
 * afterwards, `sendEmail` finds no key and takes its "not configured" path.
 */
delete process.env.RESEND_API_KEY

/**
 * Who gets the two-day reminder about a brand they left behind, and who does
 * not.
 *
 * Every rule here is a reason *not* to email somebody, and that asymmetry is
 * the point: a false negative is one quiet customer, and a false positive is
 * unsolicited mail to someone who already came back, already paid, or already
 * heard from us. The eligibility query is a single statement with nine
 * conditions in it, and none of them fail loudly — a broken one just widens the
 * audience.
 *
 * Needs a database. Usage: pnpm test:brand-nudge
 */

const HOURS = 60 * 60 * 1000

async function main() {
  const { db } = await import('../src/server/db')
  const {
    assistantMessages,
    assistantThreads,
    brandingAssets,
    contentItems,
    generationJobs,
    members,
    organizations,
    plans,
    projectEmails,
    projects,
    subscriptions,
    users,
  } = await import('../src/server/db/schema')
  const { findNudgeCandidates, sendBrandNudge } = await import(
    '../src/server/services/brand-nudge'
  )

  const stamp = Date.now()
  const orgId = `nudge-test-org-${stamp}`
  const userId = `nudge-test-user-${stamp}`

  await db.insert(users).values({
    id: userId,
    name: 'Nudge Test',
    email: `nudge-${stamp}@brandora-test.invalid`,
    emailVerified: true,
    locale: 'en',
  })

  await db.insert(organizations).values({
    id: orgId,
    name: 'Nudge Test Org',
    slug: `nudge-test-${stamp}`,
  })

  await db.insert(members).values({
    id: `nudge-test-member-${stamp}`,
    organizationId: orgId,
    userId,
    role: 'owner',
  })

  /** A finished brand, generated `hoursAgo` hours ago. */
  async function brand(title: string, hoursAgo: number) {
    const finishedAt = new Date(Date.now() - hoursAgo * HOURS)

    const [project] = await db
      .insert(projects)
      .values({
        organizationId: orgId,
        createdBy: userId,
        title,
        businessName: title,
        industry: 'Testing',
        country: 'Testland',
        brandStyle: 'minimal',
        brandBrief: 'A scratch brand for the nudge contract.',
        status: 'completed',
        /* The pipeline's own trailing write lands on the run's finish time.
           Every eligible fixture has to look like that, or the test would be
           asserting against a state the product never produces. */
        updatedAt: finishedAt,
      })
      .returning({ id: projects.id })

    await db.insert(generationJobs).values({
      projectId: project.id,
      trigger: 'initial',
      sections: ['branding', 'logos'],
      status: 'completed',
      creditsReserved: 0,
      creditsCharged: 0,
      createdAt: finishedAt,
      startedAt: finishedAt,
      finishedAt,
    })

    return { id: project.id, finishedAt }
  }

  const found = async () => new Set((await findNudgeCandidates()).map((c) => c.projectId))

  try {
    /* ---------- the baseline ---------- */
    const eligible = await brand('nudge eligible', 72)
    assert.ok(
      (await found()).has(eligible.id),
      'a brand finished three days ago, untouched and unpaid, should be due a reminder',
    )

    /* ---------- the window ---------- */
    const tooRecent = await brand('nudge too recent', 12)
    assert.ok(!(await found()).has(tooRecent.id), 'twelve hours is not two days')

    const tooOld = await brand('nudge too old', 24 * 20)
    assert.ok(
      !(await found()).has(tooOld.id),
      'a brand abandoned three weeks ago is backlog, not a reminder',
    )

    /* ---------- came back and did something ---------- */
    const ranAgain = await brand('nudge ran again', 72)
    await db.insert(generationJobs).values({
      projectId: ranAgain.id,
      trigger: 'regenerate',
      sections: ['logos'],
      status: 'completed',
      creditsReserved: 0,
      createdAt: new Date(ranAgain.finishedAt.getTime() + HOURS),
    })
    assert.ok(!(await found()).has(ranAgain.id), 'a second run means they came back')

    const wroteContent = await brand('nudge wrote content', 72)
    const contentId = randomUUID()
    await db.insert(contentItems).values({
      /* Supplied rather than generated: this id is the idempotency key for the
         row and its ledger entries, so the column has no default. A first
         version is its own lineage root. */
      id: contentId,
      rootId: contentId,
      organizationId: orgId,
      projectId: wroteContent.id,
      type: 'social_post',
      status: 'ready',
      createdAt: new Date(wroteContent.finishedAt.getTime() + HOURS),
    })
    assert.ok(!(await found()).has(wroteContent.id), 'writing content means they came back')

    const usedAssistant = await brand('nudge used assistant', 72)
    const [thread] = await db
      .insert(assistantThreads)
      .values({ projectId: usedAssistant.id })
      .returning({ id: assistantThreads.id })
    await db.insert(assistantMessages).values({
      threadId: thread.id,
      role: 'user',
      content: 'make the palette warmer',
      createdAt: new Date(usedAssistant.finishedAt.getTime() + HOURS),
    })
    assert.ok(!(await found()).has(usedAssistant.id), 'talking to the assistant means they came back')

    const edited = await brand('nudge edited', 72)
    await db
      .update(projects)
      .set({ updatedAt: new Date(edited.finishedAt.getTime() + HOURS) })
      .where(eq(projects.id, edited.id))
    assert.ok(!(await found()).has(edited.id), 'editing the project means they came back')

    /*
     * The grace, and the reason it exists. A branding row written by the
     * pipeline moments after the run finished is not a customer returning — it
     * is the run itself. Without the margin this test is the one that fails,
     * and in production nobody would ever be emailed at all.
     */
    const settling = await brand('nudge settling', 72)
    await db
      .update(brandingAssets)
      .set({ updatedAt: new Date(settling.finishedAt.getTime() + 30 * 1000) })
      .where(eq(brandingAssets.projectId, settling.id))
    assert.ok(
      (await found()).has(settling.id),
      'the pipeline’s own trailing write must not count as the customer returning',
    )

    /* ---------- bought a plan ---------- */
    const upgraded = await brand('nudge upgraded', 72)
    const [plan] = await db.select({ id: plans.id }).from(plans).limit(1)
    await db.insert(subscriptions).values({
      organizationId: orgId,
      planId: plan.id,
      polarSubscriptionId: `nudge-test-sub-${stamp}`,
      status: 'active',
      interval: 'monthly',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * HOURS),
    })
    assert.ok(
      !(await found()).has(upgraded.id),
      'somebody who bought a plan does not need talking into it',
    )
    // The subscription is on the whole org, so it now suppresses every fixture.
    await db.delete(subscriptions).where(eq(subscriptions.organizationId, orgId))
    assert.ok((await found()).has(eligible.id), 'removing the plan should restore eligibility')

    /* ---------- sent exactly once ---------- */
    assert.equal(await sendBrandNudge({
      projectId: eligible.id,
      brand: 'Nudge Eligible',
      email: `nudge-${stamp}@brandora-test.invalid`,
      locale: 'en',
    }), false, 'with no mail key configured the send reports undelivered')

    // Claimed even so — the row is written before the send, deliberately.
    const claims = await db
      .select()
      .from(projectEmails)
      .where(eq(projectEmails.projectId, eligible.id))
    assert.equal(claims.length, 1, 'the send should have claimed exactly one row')

    assert.ok(
      !(await found()).has(eligible.id),
      'a project already emailed must drop out of the candidates',
    )

    /*
     * The guard itself. A retried step or two overlapping sweeps reach this
     * with the same project, and the unique index is what refuses the second —
     * not a check-then-write, which would let both through.
     */
    const second = await sendBrandNudge({
      projectId: eligible.id,
      brand: 'Nudge Eligible',
      email: `nudge-${stamp}@brandora-test.invalid`,
      locale: 'en',
    })
    assert.equal(second, false, 'a second send for the same project must be refused')

    const afterSecond = await db
      .select()
      .from(projectEmails)
      .where(eq(projectEmails.projectId, eligible.id))
    assert.equal(afterSecond.length, 1, 'the second attempt must not have written a row')

    /* ---------- who we never write to ---------- */
    await db.update(users).set({ emailVerified: false }).where(eq(users.id, userId))
    const unverified = await brand('nudge unverified', 72)
    assert.ok(
      !(await found()).has(unverified.id),
      'an unverified address is one we have never reached — never mail it',
    )

    console.log('✓ brand nudge: window, return signals, plan check, and sent exactly once')
  } finally {
    /* Cascades through members, projects, jobs, branding and claims. */
    await db.delete(organizations).where(eq(organizations.id, orgId))
    await db.delete(users).where(eq(users.id, userId))
  }
}

/* The exit is here rather than in the `finally`: `process.exit` inside one runs
   before a rejected assertion is ever reported, which is a test that fails
   silently. postgres.js keeps the process alive, so it still has to be told. */
main().then(
  () => process.exit(0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
