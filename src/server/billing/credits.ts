import 'server-only'

import { and, eq, inArray, sql } from 'drizzle-orm'

import { AppError } from '@/lib/errors'
import { db } from '@/server/db'
import { creditTransactions, organizations } from '@/server/db/schema'

/**
 * Credit costs per generated section. 1 credit ~ $0.05 of upstream AI cost.
 *
 * Logos dominate: four Seedream images cost ~$0.30 against ~$0.012 for all the
 * text combined. Pricing levers belong on image count, not tokens.
 *
 * This table is the brand run only. Content Studio prices its own operations in
 * `CONTENT_CREDIT_COSTS` below, and the two must stay apart: `GenerationSection`
 * is `keyof typeof CREDIT_COSTS`, and it reaches `sectionsForProject`,
 * `startGeneration({ only })`, the Inngest settle step and the
 * `Generation.steps.*` message keys. A content type added here would type-check
 * into a brand run and render a step nothing can name.
 */
export const CREDIT_COSTS = {
  branding: 1,
  logos: 6,
  website: 1,
  social: 1,
  /*
   * Three generated photographs at $0.0675 each, plus eight renders and a
   * printed document that cost only time. Priced beside `logos`, which is six
   * credits for two images — a kit is more machine work and less model work,
   * so it sits below it.
   */
  kit: 4,
} as const

/**
 * What one brand costs, in credits.
 *
 * Customers are sold credits, not brands. A brand count was the headline until
 * it stopped describing the product: almost nobody makes twenty brands a month,
 * and once credits also buy content the count says nothing about what a plan is
 * worth. Credits lead now, and this is the exchange rate that still lets a
 * surface answer "how many more brands is that" — derived, never written twice,
 * so changing a section's price moves every surface with it.
 *
 * Everything a paid plan can produce: the naming and story, both logo
 * concepts, the website, the written social copy, and the designed kit.
 */
export const BRAND_COST =
  CREDIT_COSTS.branding +
  CREDIT_COSTS.logos +
  CREDIT_COSTS.website +
  CREDIT_COSTS.social +
  CREDIT_COSTS.kit

/**
 * What one brand costs on a plan that cannot publish a site or design a kit.
 *
 * The free plan's brand is a smaller object than a paid one — the naming, the
 * story, both logos and the written social copy — so counting it at the full
 * rate would report "0 brands" for a plan whose entire promise is one.
 */
export const BRAND_COST_STARTER =
  CREDIT_COSTS.branding + CREDIT_COSTS.logos + CREDIT_COSTS.social

/**
 * How many brands a balance is worth on a given plan.
 *
 * One function for every surface that shows the number — the pricing cards,
 * the comparison table and the billing page — because the moment it is
 * written twice the three of them start disagreeing about what a plan buys.
 *
 * The rate depends on what the plan can produce: a plan without the website
 * and the designed kit makes a smaller brand, and counting it at the full rate
 * reports zero for a plan whose entire promise is one.
 */
export function brandsFrom(
  credits: number,
  plan: { websiteBuilder: boolean; socialMediaKit: boolean },
) {
  const full = plan.websiteBuilder && plan.socialMediaKit
  return Math.floor(credits / (full ? BRAND_COST : BRAND_COST_STARTER))
}

export type GenerationSection = keyof typeof CREDIT_COSTS

export function creditsForSections(sections: GenerationSection[]): number {
  return sections.reduce((total, section) => total + CREDIT_COSTS[section], 0)
}

/**
 * Credit costs per Content Studio operation. Sibling of `CREDIT_COSTS`, never
 * merged into it — see the note there for what `GenerationSection` reaches.
 *
 * A post is one model call on the `social` chain: the brand block and the brief
 * are ~1,300 input tokens, the captions ~900 output, which is ~$0.0016 — a
 * thirtieth of a single generated image. So the number below is not derived
 * from tokens; one credit is simply the floor, and it is the same floor the
 * `social` section already sets by buying nine written posts for one credit.
 *
 * Only work that calls a model is priced. Editing, duplicating, deleting and
 * exporting make no call and cost nothing.
 */
export const CONTENT_CREDIT_COSTS = {
  social_post: 1,
  /*
   * Three, for five rendered images against a caption's one.
   *
   * It is not three times the model work — the copy is one call, much like a
   * post's. It is three times the deliverable: five finished pictures a
   * customer can post without opening a design tool, drawn on photography the
   * kit already paid for, so the upstream cost is about half a cent and the
   * margin is the highest of anything here.
   *
   * Priced on what it is worth rather than what it costs, deliberately, and
   * the reverse of the mistake the social kit made at four credits.
   */
  carousel: 3,
  /*
   * One, like a caption, because it is one picture.
   *
   * A carousel is five frames and an argument; a story is a single portrait
   * image that expires in a day. Pricing them the same would say the sequence
   * was never worth three.
   */
  story: 1,
} as const

export type ContentType = keyof typeof CONTENT_CREDIT_COSTS

/** Each variant past the first is another pass over the same brand context. */
export const CONTENT_VARIANT_COST = 1

export function creditsForContent(params: { type: ContentType; variants?: number }): number {
  const variants = Math.max(1, params.variants ?? 1)
  return CONTENT_CREDIT_COSTS[params.type] + (variants - 1) * CONTENT_VARIANT_COST
}

/**
 * How many pieces of content a balance is worth.
 *
 * The counterpart to `brandsFrom`, and shown beside it: a plan's credits buy
 * brands or content, and quoting only one of the two understates it.
 */
export function contentPiecesFrom(credits: number) {
  return Math.floor(credits / CONTENT_CREDIT_COSTS.social_post)
}

type LedgerEntry = {
  organizationId: string
  amount: number
  reason: (typeof creditTransactions.$inferInsert)['reason']
  projectId?: string | null
  generationJobId?: string | null
  polarOrderId?: string | null
  idempotencyKey?: string | null
  metadata?: Record<string, unknown>
  /** Permits the balance to go below zero. Only refund reversals should. */
  allowNegative?: boolean
}

/**
 * Writes one ledger row and moves the cached balance in the same transaction.
 *
 * The row is the source of truth; `organizations.credit_balance` is a cache so
 * reads stay cheap. Both move together or neither does.
 *
 * Returns null when `idempotencyKey` has already been used — that is a success,
 * not an error: it means a webhook or job retried and the effect already landed.
 */
export async function writeLedgerEntry(entry: LedgerEntry) {
  return db.transaction(async (tx) => {
    // Locking the organization row serialises concurrent spends, so two
    // generations started at once cannot both pass the balance check — and so
    // two deliveries of the same webhook queue up rather than racing.
    const [org] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.id, entry.organizationId))
      .for('update')
      .limit(1)

    if (!org) throw new AppError('NOT_FOUND', 'Organization not found.')

    const balanceAfter = org.creditBalance + entry.amount

    if (balanceAfter < 0 && !entry.allowNegative) {
      throw new AppError(
        'INSUFFICIENT_CREDITS',
        `This needs ${Math.abs(entry.amount)} credits but only ${org.creditBalance} remain.`,
      )
    }

    /*
     * The unique index decides whether this entry is new, rather than a read
     * that precedes the write.
     *
     * Checking for the key first and inserting afterwards is correct until two
     * deliveries arrive at once: both read nothing, both insert, and the loser
     * aborts on the unique index. The money stayed right — the index saw to
     * that — but the request failed with a 500, and Polar answers a 500 by
     * delivering again. Under a burst of retries that was most of them.
     */
    const inserted = await tx
      .insert(creditTransactions)
      .values({
        organizationId: entry.organizationId,
        amount: entry.amount,
        balanceAfter,
        reason: entry.reason,
        projectId: entry.projectId ?? null,
        generationJobId: entry.generationJobId ?? null,
        polarOrderId: entry.polarOrderId ?? null,
        idempotencyKey: entry.idempotencyKey ?? null,
        metadata: entry.metadata ?? {},
      })
      .onConflictDoNothing({ target: creditTransactions.idempotencyKey })
      .returning()

    // Nothing inserted means the key already landed: the effect is applied, so
    // this is a success that must not move the balance a second time.
    if (inserted.length === 0) return null

    await tx
      .update(organizations)
      .set({ creditBalance: balanceAfter })
      .where(eq(organizations.id, entry.organizationId))

    return inserted[0]
  })
}

/** Holds credits up front so a long-running job cannot overdraw the account. */
export async function reserveCredits(params: {
  organizationId: string
  amount: number
  projectId: string
  generationJobId: string
}) {
  if (params.amount <= 0) return null

  return writeLedgerEntry({
    organizationId: params.organizationId,
    amount: -params.amount,
    reason: 'generation',
    projectId: params.projectId,
    generationJobId: params.generationJobId,
    idempotencyKey: `reserve:${params.generationJobId}`,
    metadata: { kind: 'reservation' },
  })
}

/**
 * Settles a reservation against what the job actually used.
 *
 * Sections that failed are never charged for, so the usual case is a refund.
 * The overspend branch should be unreachable — `startGeneration` reserves for
 * exactly the sections it dispatches — but it is handled rather than ignored:
 * silently absorbing the difference would hand out free credits and leave the
 * ledger disagreeing with what was delivered.
 */
export async function settleCredits(params: {
  organizationId: string
  reserved: number
  used: number
  projectId: string
  generationJobId: string
}) {
  const delta = params.reserved - params.used
  if (delta === 0) return null

  if (delta < 0) {
    console.warn(
      `[credits] job ${params.generationJobId} used ${params.used} credits but reserved ${params.reserved}; charging the difference`,
    )
  }

  return writeLedgerEntry({
    organizationId: params.organizationId,
    // Positive refunds the unused hold; negative charges the overspend.
    amount: delta,
    reason: delta > 0 ? 'refund' : 'generation',
    projectId: params.projectId,
    generationJobId: params.generationJobId,
    idempotencyKey: `settle:${params.generationJobId}`,
    metadata: { kind: 'settlement', reserved: params.reserved, used: params.used },
  })
}

/*
 * Content Studio holds and settles the same way, keyed on the content item
 * rather than a generation job.
 *
 * Separate functions rather than a widened signature: `reserveCredits` and
 * `settleCredits` are shared with the Inngest pipeline and the cron that sweeps
 * abandoned holds, and that path is worth leaving exactly as it is. What
 * carries over is the part that matters — a stable id in the idempotency key,
 * so a hold is taken once and released once no matter how many times the caller
 * runs.
 *
 * `generationJobId` stays null. The column has no foreign key so a content id
 * would fit, but writing one would make the admin screens report a job that
 * does not exist. `projectId` is set, which is what keeps the billing ledger
 * able to say which brand a charge belongs to.
 */

/** Holds credits before a content generation runs. */
export async function reserveForContent(params: {
  organizationId: string
  amount: number
  projectId: string
  contentItemId: string
}) {
  if (params.amount <= 0) return null

  return writeLedgerEntry({
    organizationId: params.organizationId,
    amount: -params.amount,
    reason: 'generation',
    projectId: params.projectId,
    idempotencyKey: `reserve:content:${params.contentItemId}`,
    metadata: { kind: 'reservation', contentItemId: params.contentItemId },
  })
}

/**
 * Settles a content hold. A failed generation is never charged for, so the
 * usual case here is a full refund written from the action's catch block.
 */
export async function settleForContent(params: {
  organizationId: string
  reserved: number
  used: number
  projectId: string
  contentItemId: string
}) {
  const delta = params.reserved - params.used
  if (delta === 0) return null

  if (delta < 0) {
    console.warn(
      `[credits] content ${params.contentItemId} used ${params.used} credits but reserved ${params.reserved}; charging the difference`,
    )
  }

  return writeLedgerEntry({
    organizationId: params.organizationId,
    amount: delta,
    reason: delta > 0 ? 'refund' : 'generation',
    projectId: params.projectId,
    idempotencyKey: `settle:content:${params.contentItemId}`,
    metadata: {
      kind: 'settlement',
      contentItemId: params.contentItemId,
      reserved: params.reserved,
      used: params.used,
    },
  })
}

/**
 * Every reason a run can write, including the refund that undoes one.
 *
 * The refund is in the list on purpose: a first run that failed is reserved and
 * then given straight back, and summing the pair to zero is what makes a run
 * nobody received not count as a run.
 */
const RUN_REASONS = ['generation', 'logo_render', 'assistant_message', 'refund'] as const

/**
 * Whether this organization must confirm its address before it may spend.
 *
 * The gate used to be "unverified accounts cannot generate at all", which read
 * as an anti-abuse measure and worked as a wall: of nine accounts, every
 * verified one ran a generation within eight minutes and neither unverified one
 * ever spent a credit, or was told why. Nobody signs up to prove an address —
 * they sign up to see a brand.
 *
 * So the first run is free of it, and verification is asked for at the point it
 * means something: a second one. What that costs is bounded and known. The free
 * grant is written once per organization at signup and nothing else adds to it
 * without a payment, so an unconfirmed address can spend
 * `FREE_STARTING_CREDITS` — about fifteen cents of model spend — and then not a
 * credit more.
 */
export async function mustVerifyEmail(
  organizationId: string,
  emailVerified: boolean,
): Promise<boolean> {
  if (emailVerified) return false

  const [row] = await db
    .select({ net: sql<number>`coalesce(sum(${creditTransactions.amount}), 0)::int` })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.organizationId, organizationId),
        inArray(creditTransactions.reason, [...RUN_REASONS]),
      ),
    )

  // Spends are negative, so anything below zero is a run that was delivered.
  return (row?.net ?? 0) < 0
}

export async function getBalance(organizationId: string): Promise<number> {
  const [org] = await db
    .select({ balance: organizations.creditBalance })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  return org?.balance ?? 0
}

/**
 * Recomputes the cached balance from the ledger. The ledger is authoritative,
 * so this repairs drift rather than the other way around.
 */
export async function reconcileBalance(organizationId: string) {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${creditTransactions.amount}), 0)::int` })
    .from(creditTransactions)
    .where(eq(creditTransactions.organizationId, organizationId))

  await db
    .update(organizations)
    .set({ creditBalance: row?.total ?? 0 })
    .where(eq(organizations.id, organizationId))

  return row?.total ?? 0
}
