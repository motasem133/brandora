import { Inngest, eventType, staticSchema } from 'inngest'

/**
 * Event contract for the generation pipeline.
 *
 * `staticSchema` gives compile-time types without pulling a validator into the
 * runtime path — the payload is built by our own service, so it is already
 * trusted by the time it is sent.
 */
export const generateRequested = eventType('brand/generate.requested', {
  schema: staticSchema<{
    projectId: string
    jobId: string
    organizationId: string
    sections: string[]
  }>(),
})

/**
 * One app id per environment.
 *
 * Inngest keys an app by its id, and the id was a bare constant — so
 * production, every preview and every local `inngest dev` presented themselves
 * as the same app. Whichever registered last owned the URL, which means a
 * preview deployment could quietly take production's registration and answer
 * production's events on a build nobody had reviewed.
 *
 * That is the 9 August incident. Two customers started runs that were never
 * collected, and their credits sat held until the sweep returned them.
 *
 * Production keeps `brandora` so the existing app is not orphaned and its
 * history stays in one place; everything else is suffixed and registers as its
 * own app. `VERCEL_ENV` is absent locally, which is the development case.
 */
const APP_ID =
  process.env.VERCEL_ENV === 'production'
    ? 'brandora'
    : `brandora-${process.env.VERCEL_ENV ?? 'development'}`

/**
 * Rendered content, which is pictures and therefore cannot be made in the
 * request that asks for it.
 *
 * Content Studio is otherwise synchronous on purpose — a caption is one model
 * call and a few seconds, and routing that through a queue would make it
 * slower and give it a progress list with one entry. Rendered types are the
 * exception: every frame launches its own Chromium at about ten seconds, so
 * five frames is most of a minute before the model has written a word.
 */
export const renderedContentRequested = eventType('content/rendered.requested', {
  schema: staticSchema<{
    contentItemId: string
    projectId: string
    organizationId: string
    /** Which rendered type — the pipeline is the same, the artwork is not. */
    type: 'carousel' | 'story'
  }>(),
})

/**
 * The chosen logo changed, so everything drawn with the old one is stale.
 *
 * `rederivePrimaryAssets` rebuilds the favicon, the avatars, the OG card, the
 * monochrome mark and the kit ZIP inside the request that made the choice.
 * It has never rebuilt the kit's posts, because eight posts is eight Chromium
 * launches — so a customer who picked a different mark kept the old one on
 * every social post they had, indefinitely, until they paid for a kit rerun.
 * The product's first principle is that the kit agrees with itself.
 *
 * A queue is the only place that work fits. Nothing here is paid: the
 * photography is reused and the copy is already written, so this re-renders
 * from bytes the customer already owns.
 */
export const logoChanged = eventType('brand/logo.changed', {
  schema: staticSchema<{
    projectId: string
    organizationId: string
  }>(),
})

export const inngest = new Inngest({ id: APP_ID })
