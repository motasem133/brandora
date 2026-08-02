import 'server-only'

import { eq, sql } from 'drizzle-orm'

import { AppError } from '@/lib/errors'
import { db } from '@/server/db'
import { creditTransactions, organizations } from '@/server/db/schema'

/**
 * Credit costs per generated section. 1 credit ~ $0.05 of upstream AI cost.
 *
 * Logos dominate: four Seedream images cost ~$0.30 against ~$0.012 for all the
 * text combined. Pricing levers belong on image count, not tokens.
 */
export const CREDIT_COSTS = {
  branding: 1,
  logos: 6,
  website: 1,
  social: 1,
} as const

export type GenerationSection = keyof typeof CREDIT_COSTS

export function creditsForSections(sections: GenerationSection[]): number {
  return sections.reduce((total, section) => total + CREDIT_COSTS[section], 0)
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
    if (entry.idempotencyKey) {
      const existing = await tx
        .select({ id: creditTransactions.id })
        .from(creditTransactions)
        .where(eq(creditTransactions.idempotencyKey, entry.idempotencyKey))
        .limit(1)

      if (existing.length > 0) return null
    }

    // Locking the organization row serialises concurrent spends, so two
    // generations started at once cannot both pass the balance check.
    const [org] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.id, entry.organizationId))
      .for('update')
      .limit(1)

    if (!org) throw new AppError('NOT_FOUND', 'Organization not found.')

    const balanceAfter = org.creditBalance + entry.amount

    if (balanceAfter < 0) {
      throw new AppError(
        'INSUFFICIENT_CREDITS',
        `This needs ${Math.abs(entry.amount)} credits but only ${org.creditBalance} remain.`,
      )
    }

    const [row] = await tx
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
      .returning()

    await tx
      .update(organizations)
      .set({ creditBalance: balanceAfter })
      .where(eq(organizations.id, entry.organizationId))

    return row
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
