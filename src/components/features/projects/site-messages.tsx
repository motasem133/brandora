import { getTranslations } from 'next-intl/server'
import { desc, eq } from 'drizzle-orm'

import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { db } from '@/server/db'
import { siteMessages } from '@/server/db/schema'

/**
 * What visitors sent through the published site.
 *
 * The email is the delivery and this is the record — so this exists for the
 * week a customer asks "has anybody actually contacted me?", and for the
 * message that bounced, went to spam, or arrived while they were changing
 * address.
 *
 * Rendered only when there is something in it. An empty panel promising
 * enquiries is a worse answer than no panel: it invites a customer to wonder
 * whether the form works, which is exactly the doubt a record is meant to end.
 */
export async function SiteMessages({
  projectId,
  locale,
  limit = 10,
}: {
  projectId: string
  locale: string
  limit?: number
}) {
  const t = await getTranslations('Website')

  const messages = await db
    .select()
    .from(siteMessages)
    .where(eq(siteMessages.projectId, projectId))
    .orderBy(desc(siteMessages.createdAt))
    .limit(limit)

  if (messages.length === 0) return null

  return (
    <section className="space-y-3">
      <div>
        <CardTitle>{t('messagesTitle')}</CardTitle>
        <CardDescription className="mt-1">{t('messagesSubtitle')}</CardDescription>
      </div>

      <Card className="p-0">
        <ul className="divide-y divide-line">
          {messages.map((message) => (
            <li key={message.id} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-medium text-fg">
                  {message.name}{' '}
                  {/*
                    A mailto rather than plain text. Answering is the only thing
                    anybody does with one of these, and the reply-to on the
                    email already makes that one press — this is the same press
                    for somebody who found it here instead.
                  */}
                  <a
                    href={`mailto:${message.email}`}
                    className="font-normal text-fg-secondary hover:underline"
                  >
                    {message.email}
                  </a>
                </p>
                <span className="text-xs text-fg-muted">
                  {formatDate(message.createdAt, locale)}
                </span>
              </div>

              {/* Their line breaks, kept. A form is a textarea and people use it
                  like one; collapsing that turns paragraphs into one. */}
              <p dir="auto" className="mt-1.5 whitespace-pre-wrap text-sm text-fg-secondary">
                {message.message}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  )
}
