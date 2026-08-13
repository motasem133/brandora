import { z } from 'zod'

import { db } from '@/server/db'
import { getPublishedSite } from '@/server/db/queries/sites'
import { siteMessages, users, members } from '@/server/db/schema'
import { sendEmail } from '@/server/email/send'
import { and, eq } from 'drizzle-orm'

/**
 * A message from a visitor to a published customer site.
 *
 * The one endpoint in this product written by somebody with no account, no
 * session and no relationship to us — so everything it trusts, it re-derives.
 * The site is resolved from the host the proxy rewrote, never from a field in
 * the body: a `projectId` parameter would let anyone post into any workspace.
 *
 * It lives under `/sites/[subdomain]` rather than `/api` because that is where
 * the proxy sends a customer domain. A form on `theircompany.com/contact` is
 * rewritten here with the host as the segment, which is the same route the page
 * itself came from — so the form posts to its own address and nothing has to
 * know the app's domain.
 *
 * Note for later: there is deliberately no rate limit or honeypot here yet.
 * That was a decision, not an oversight — the messages land in a customer's
 * inbox rather than ours, and what real traffic looks like is unknown. The
 * thing to watch is not spam volume but sending reputation: this posts to
 * Resend from our domain on an unauthenticated request, so the first sign of
 * abuse is a deliverability problem, not a full inbox. A per-IP limit on the
 * `rate_limits` table already in the schema is the smallest fix when it comes.
 */
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(200),
  /* Long enough for a real enquiry, short enough that the column is not a
     place to paste a novel. */
  message: z.string().trim().min(10).max(2000),
})

export async function POST(request: Request, { params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params

  const site = await getPublishedSite(decodeURIComponent(subdomain))
  if (!site) return Response.json({ error: 'Not found' }, { status: 404 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: 'Please check the form and try again.' }, { status: 400 })
  }

  const { name, email, message } = parsed.data

  /*
   * Stored first, emailed second, and the row records which happened.
   *
   * Email is the delivery and this is the record: a bounce, a spam folder or a
   * missing key must not lose a customer's enquiry. Writing first also means
   * the visitor's "thank you" is honest — the message is kept whether or not
   * the mail goes out.
   */
  const [row] = await db
    .insert(siteMessages)
    .values({
      projectId: site.project.id,
      organizationId: site.project.organizationId,
      name,
      email,
      message,
    })
    .returning({ id: siteMessages.id })

  /*
   * The owner, found through the workspace rather than from the site.
   *
   * `contact.email` on the block is whatever the model wrote or the customer
   * typed into the builder — it is what visitors are shown, not necessarily an
   * address we can reach. The account holder is.
   */
  const [owner] = await db
    .select({ email: users.email, name: users.name })
    .from(members)
    .innerJoin(users, eq(users.id, members.userId))
    .where(and(eq(members.organizationId, site.project.organizationId), eq(members.role, 'owner')))
    .limit(1)

  if (owner) {
    const sent = await sendEmail({
      to: owner.email,
      /* Reply-to is the visitor, so answering is one press rather than a
         copy-paste out of the body. */
      replyTo: email,
      template: {
        kind: 'site-message',
        siteName: site.project.businessName || site.project.title,
        fromName: name,
        fromEmail: email,
        message,
      },
      locale: site.project.language,
    })

    if (sent.delivered) {
      await db.update(siteMessages).set({ emailed: true }).where(eq(siteMessages.id, row.id))
    }
  }

  return Response.json({ ok: true })
}
