import 'server-only'

import { and, desc, eq } from 'drizzle-orm'

import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'
import { creditsForSections, reserveCredits, type GenerationSection } from '@/server/billing/credits'
import { db } from '@/server/db'
import { generationJobs, projects } from '@/server/db/schema'
import { inngest } from '@/server/inngest/client'
import { isStorageConfigured } from '@/server/storage/r2'

/**
 * Which steps a generation will run.
 *
 * Logos are included only when image generation and storage are both
 * configured — otherwise the step would reserve six credits and then fail,
 * and a refund the user never asked for is worse than not offering it.
 */
export function sectionsForProject(project: {
  needsWebsite: boolean
  needsSocialMedia: boolean
}): GenerationSection[] {
  const sections: GenerationSection[] = ['branding']
  if (isLogoGenerationAvailable()) sections.push('logos')
  if (project.needsWebsite) sections.push('website')
  if (project.needsSocialMedia) sections.push('social')
  return sections
}

export function isLogoGenerationAvailable() {
  return Boolean(env.FAL_KEY) && isStorageConfigured()
}

export async function getLatestJobForProject(projectId: string) {
  const [job] = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.projectId, projectId))
    .orderBy(desc(generationJobs.createdAt))
    .limit(1)

  return job ?? null
}

/**
 * Creates the job row, reserves credits, and emits the Inngest event.
 *
 * Credits are reserved before the event is sent: if the reservation fails the
 * user is told immediately rather than watching a job start and then die.
 */
export async function startGeneration(params: {
  organizationId: string
  userId: string
  projectId: string
  emailVerified: boolean
}) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.projectId), eq(projects.organizationId, params.organizationId)))
    .limit(1)

  if (!project) throw new AppError('NOT_FOUND', 'Project not found.')

  if (project.status === 'queued' || project.status === 'generating') {
    throw new AppError('GENERATION_IN_PROGRESS', 'This project is already generating.')
  }

  // Free credits are the obvious abuse target, so verification gates spending
  // rather than sign-in.
  if (!params.emailVerified) {
    throw new AppError('EMAIL_NOT_VERIFIED', 'Please verify your email address to generate.')
  }

  const sections = sectionsForProject(project)
  const cost = creditsForSections(sections)

  const [job] = await db
    .insert(generationJobs)
    .values({
      projectId: project.id,
      trigger: 'initial',
      sections,
      progress: Object.fromEntries(sections.map((s) => [s, { status: 'pending' }])),
      status: 'queued',
      creditsReserved: cost,
    })
    .returning()

  try {
    await reserveCredits({
      organizationId: params.organizationId,
      amount: cost,
      projectId: project.id,
      generationJobId: job.id,
    })
  } catch (error) {
    // Roll the job back so a failed reservation leaves no orphaned queued row.
    await db.delete(generationJobs).where(eq(generationJobs.id, job.id))
    throw error
  }

  await db.update(projects).set({ status: 'queued' }).where(eq(projects.id, project.id))

  await inngest.send({
    name: 'brand/generate.requested',
    data: {
      projectId: project.id,
      jobId: job.id,
      organizationId: params.organizationId,
      sections,
    },
  })

  return { jobId: job.id, creditsReserved: cost, sections }
}
