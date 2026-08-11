import 'server-only'

import { and, eq } from 'drizzle-orm'

import { AppError } from '@/lib/errors'
import { type BuiltContentType, MAX_VARIANTS, isRenderedType } from '@/lib/content'
import { contentSocialPostSchemaFor } from '@/server/ai/schemas'
import { contentSocialPostPrompt, contentSocialPostSystem, PROMPT_VERSIONS } from '@/server/ai/prompts'
import { runModel } from '@/server/ai/run'
import {
  creditsForContent,
  mustVerifyEmail,
  reserveForContent,
  settleForContent,
} from '@/server/billing/credits'
import { db } from '@/server/db'
import { inngest } from '@/server/inngest/client'
import { brandingAssets, contentItems, generatedFiles, projects } from '@/server/db/schema'

/**
 * Content Studio's generate step.
 *
 * Synchronous, unlike a brand run. One text call lands in a few seconds, and
 * the async pipeline exists for work that does not: a logo image is minutes,
 * and the kit launches a browser eight times. Routing a five-second call
 * through Inngest and a stream that polls every 1.5s would make it slower and
 * give it a progress list with one entry.
 *
 * The refund is the other half of that argument. Async, a failure is caught by
 * three separate mechanisms — the settle step, `onFailure`, and a cron — because
 * the request is long gone. Here it is a catch block, and the customer sees the
 * credit come back in the same response that told them it failed.
 *
 * Everything that made the async path safe is kept: the hold is taken before
 * the model runs, both ledger writes are keyed on the item id so they happen
 * once each, and the row is deleted if the hold cannot be taken.
 */

/** Beyond this, a model that is merely slow is indistinguishable from a hung one. */
const MODEL_TIMEOUT_MS = 60_000

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new AppError('AI_PROVIDER_ERROR', 'That took too long. Nothing was charged.')),
          ms,
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

export type GenerateContentParams = {
  organizationId: string
  userId: string
  projectId: string
  /** The row id, chosen by the client so a double submit is one charge. */
  contentItemId: string
  type: BuiltContentType
  brief: string
  tone: string | null
  variants: number
  emailVerified: boolean
}

export async function generateContentItem(params: GenerateContentParams) {
  /*
   * A rendered type is one piece, whatever the client asked for.
   *
   * The composer hides the variants control for a carousel, but the action
   * takes 1 to 3 for every type and `creditsForContent` charges a credit for
   * each one past the first. A request made outside the form — the same shape,
   * `variants: 3` — would have taken five credits and produced one carousel.
   * The form is not the boundary; this is.
   */
  const variants = isRenderedType(params.type)
    ? 1
    : Math.min(Math.max(1, params.variants), MAX_VARIANTS)

  const [row] = await db
    .select({
      project: projects,
      branding: brandingAssets,
    })
    .from(projects)
    .innerJoin(brandingAssets, eq(brandingAssets.projectId, projects.id))
    .where(and(eq(projects.id, params.projectId), eq(projects.organizationId, params.organizationId)))
    .limit(1)

  /*
   * One check for both "no such project" and "not generated yet". The join
   * makes them the same miss, and the customer's next move is the same either
   * way: pick a brand that exists.
   */
  if (!row) {
    throw new AppError('NOT_FOUND', 'Generate this brand before writing content for it.')
  }

  /* The same gate `startGeneration` applies, from the same function, so the two
     cannot disagree about whose first run has been had. */
  if (await mustVerifyEmail(params.organizationId, params.emailVerified)) {
    throw new AppError(
      'EMAIL_NOT_VERIFIED',
      'Verify your email address to keep generating content.',
    )
  }

  /*
   * A drawn type needs a chosen logo, and the check belongs before the money.
   *
   * Every frame carries the mark in its corner, so without one the renderer
   * throws — which it did, after the credits were held and a model had already
   * been paid to write five lines nobody would ever see. The refund worked and
   * the customer still got "the carousel could not be made" for something they
   * could have been told about before they pressed the button.
   *
   * The kit gates this in the interface; this gates it at the boundary,
   * because the interface is not one.
   */
  if (isRenderedType(params.type) && !row.branding.primaryLogoFileId) {
    throw new AppError('NOT_FOUND', 'Choose a logo for this brand before drawing anything from it.')
  }

  /*
   * A story is the one type with no text-only fallback.
   *
   * A carousel drops to the three layouts that need no photograph when a
   * project has no kit. There is exactly one portrait layout and it is built
   * around a photograph, so a story without one is not a thinner story — it is
   * nothing. Told before the money, like the logo above it.
   */
  if (params.type === 'story') {
    const [scene] = await db
      .select({ id: generatedFiles.id })
      .from(generatedFiles)
      .where(
        and(
          eq(generatedFiles.projectId, params.projectId),
          eq(generatedFiles.kind, 'social_scene'),
        ),
      )
      .limit(1)

    if (!scene) {
      throw new AppError(
        'NOT_FOUND',
        'A story is built on the photography from your social kit. Generate the kit first.',
      )
    }
  }

  const cost = creditsForContent({ type: params.type, variants })

  /*
   * The row first, so the hold has something to be keyed to and the customer
   * has something to look at if this request dies. `onConflictDoNothing` makes
   * a resubmitted form land on the row that already exists.
   */
  const inserted = await db
    .insert(contentItems)
    .values({
      id: params.contentItemId,
      rootId: params.contentItemId,
      organizationId: params.organizationId,
      projectId: params.projectId,
      createdBy: params.userId,
      type: params.type,
      status: 'generating',
      brief: params.brief,
      tone: params.tone,
      language: row.project.language,
      creditsReserved: cost,
    })
    .onConflictDoNothing({ target: contentItems.id })
    .returning({ id: contentItems.id })

  if (inserted.length === 0) {
    return { id: params.contentItemId, creditsCharged: 0, duplicate: true as const }
  }

  try {
    await reserveForContent({
      organizationId: params.organizationId,
      amount: cost,
      projectId: params.projectId,
      contentItemId: params.contentItemId,
    })
  } catch (error) {
    // No hold, so no row. Same rollback `startGeneration` does.
    await db.delete(contentItems).where(eq(contentItems.id, params.contentItemId))
    throw error
  }

  /*
   * A rendered type leaves here as soon as its credits are held.
   *
   * Everything below this point happens inside the request, which is right for
   * a caption and impossible for five pictures: each frame launches its own
   * browser at about ten seconds. The row is already `generating` and the
   * library already draws that state, so the customer sees the piece appear
   * and fill in rather than watching a spinner on a form.
   *
   * The hold is taken above, before the event is sent, for the same reason
   * `startGeneration` does it that way round: a reservation that fails should
   * tell the customer now, not after a queue has accepted the work.
   */
  if (isRenderedType(params.type)) {
    await inngest.send({
      name: 'content/rendered.requested',
      data: {
        contentItemId: params.contentItemId,
        projectId: params.projectId,
        organizationId: params.organizationId,
        type: params.type as 'carousel' | 'story',
      },
    })

    return { id: params.contentItemId, creditsCharged: 0, duplicate: false as const, queued: true as const }
  }

  const project = row.project
  const chosenName = project.businessName

  try {
    const output = await withTimeout(
      runModel({
        task: 'social',
        schema: contentSocialPostSchemaFor(variants),
        system: contentSocialPostSystem(project.language),
        prompt: contentSocialPostPrompt({
          project: {
            industry: project.industry,
            country: project.country,
            brandBrief: project.brandBrief,
            brandStyle: project.brandStyle,
            businessName: project.businessName,
            preferredColors: project.preferredColors,
            language: project.language,
          },
          branding: row.branding,
          chosenName,
          brief: params.brief,
          tone: params.tone,
          variants,
        }),
        context: {
          organizationId: params.organizationId,
          projectId: params.projectId,
          feature: 'content',
        },
      }),
      MODEL_TIMEOUT_MS,
    )

    await db
      .update(contentItems)
      .set({
        status: 'ready',
        title: output.title,
        body: { kind: 'social_post', items: output.items },
        creditsCharged: cost,
        modelUsed: 'social',
        promptVersion: PROMPT_VERSIONS.contentSocialPost,
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, params.contentItemId))

    /* Reserved equals used, so this writes nothing. Called anyway: the day a
       type charges per delivered item, this is already the right shape. */
    await settleForContent({
      organizationId: params.organizationId,
      reserved: cost,
      used: cost,
      projectId: params.projectId,
      contentItemId: params.contentItemId,
    })

    return { id: params.contentItemId, creditsCharged: cost, duplicate: false as const }
  } catch (error) {
    await settleForContent({
      organizationId: params.organizationId,
      reserved: cost,
      used: 0,
      projectId: params.projectId,
      contentItemId: params.contentItemId,
    })

    await db
      .update(contentItems)
      .set({
        status: 'failed',
        creditsCharged: 0,
        error: error instanceof Error ? error.message.slice(0, 500) : 'Generation failed.',
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, params.contentItemId))

    throw error
  }
}
