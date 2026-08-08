import 'server-only'

import { z } from 'zod'

/**
 * What this code actually needs out of a Polar payload.
 *
 * These were hand-written structural types and every call site reached them
 * through `as never` — eleven of them, all in the webhook route and the sync
 * job. That cast is the type system being switched off at the one boundary
 * where untrusted data arrives carrying money, and it is switched off in the
 * direction that hurts: `as never` satisfies any parameter, so a payload whose
 * shape had moved would have flowed into `writeLedgerEntry` and been found out
 * as a runtime `undefined` somewhere in the ledger rather than at the door.
 *
 * Parsed rather than asserted now, and deliberately loose about everything the
 * handlers already treat as optional. The schema's job is not to reject Polar
 * for adding a field, it is to guarantee that what the handlers destructure is
 * the type they claim. Only `id` is required, because every idempotency key in
 * this system is derived from it and an event without one cannot be made safe
 * to retry.
 *
 * The types are inferred from the schemas rather than declared beside them, so
 * there is one description of the payload instead of two that can disagree.
 */

/** Polar sends timestamps as ISO strings; the SDK may hand back Date objects. */
const timestamp = z.union([z.string(), z.date()]).nullish()

const metadata = z.record(z.string(), z.unknown()).nullish()

export const polarSubscriptionSchema = z.object({
  id: z.string().min(1),
  status: z.string(),
  productId: z.string().optional(),
  currentPeriodStart: timestamp,
  currentPeriodEnd: timestamp,
  cancelAtPeriodEnd: z.boolean().optional(),
  customerId: z.string().optional(),
  metadata,
})

export const polarOrderSchema = z.object({
  id: z.string().min(1),
  amount: z.number().optional(),
  netAmount: z.number().optional(),
  totalAmount: z.number().optional(),
  taxAmount: z.number().optional(),
  refundedAmount: z.number().optional(),
  currency: z.string().optional(),
  productId: z.string().optional(),
  customerId: z.string().optional(),
  metadata,
})

export type PolarSubscription = z.infer<typeof polarSubscriptionSchema>
export type PolarOrder = z.infer<typeof polarOrderSchema>

/**
 * Raised when a payload does not carry what the handlers need.
 *
 * Its own class so the route can tell it from a database failure mid-handler.
 * The two want opposite answers: this one must be acknowledged, because
 * redelivering an unparseable payload produces an unparseable payload, and
 * Polar treats a 5xx as "send it again" for days. A database outage is exactly
 * the case where that retry is worth having.
 */
export class PolarPayloadError extends Error {
  constructor(
    readonly event: string,
    readonly issues: z.ZodError['issues'],
  ) {
    super(`Polar ${event} payload did not match the expected shape`)
    this.name = 'PolarPayloadError'
  }
}

export function parseSubscription(event: string, data: unknown): PolarSubscription {
  const result = polarSubscriptionSchema.safeParse(data)
  if (!result.success) throw new PolarPayloadError(event, result.error.issues)
  return result.data
}

export function parseOrder(event: string, data: unknown): PolarOrder {
  const result = polarOrderSchema.safeParse(data)
  if (!result.success) throw new PolarPayloadError(event, result.error.issues)
  return result.data
}
