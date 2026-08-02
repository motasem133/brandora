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

export const inngest = new Inngest({ id: 'brandora' })
