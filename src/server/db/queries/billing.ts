import 'server-only'

import { desc, eq } from 'drizzle-orm'

import { db } from '@/server/db'
import {
  creditTransactions,
  orders,
  type CreditTransaction,
  type Order,
} from '@/server/db/schema'

/**
 * What the account was charged, newest first.
 *
 * Ten rows because the billing page shows ten; a customer auditing further back
 * is asking a different question than "did my last payment land", and that
 * question wants its own paginated surface rather than a bigger constant here.
 */
export async function getRecentOrders(organizationId: string, limit = 10): Promise<Order[]> {
  return db
    .select()
    .from(orders)
    .where(eq(orders.organizationId, organizationId))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
}

/** The credit ledger, newest first. The ledger is the source of truth. */
export async function getRecentCreditTransactions(
  organizationId: string,
  limit = 10,
): Promise<CreditTransaction[]> {
  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.organizationId, organizationId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit)
}
