import { and, eq } from 'drizzle-orm'

import { db } from '@/server/db'
import { generatedFiles, projects } from '@/server/db/schema'
import { toErrorResponse } from '@/server/api-error'
import { requireOrg } from '@/server/session'
import { signedDownloadUrl } from '@/server/storage/r2'

/**
 * Redirects to a short-lived signed URL for a generated file.
 *
 * The join through `projects` is the authorisation: a file is only reachable if
 * its project belongs to the caller's organization. Object keys are guessable,
 * so the bucket itself is never public for private assets.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await handle(params)
  } catch (error) {
    return toErrorResponse(error)
  }
}

async function handle(params: Promise<{ id: string }>) {
  const { id } = await params
  const { org } = await requireOrg()

  const [file] = await db
    .select({ r2Key: generatedFiles.r2Key })
    .from(generatedFiles)
    .innerJoin(projects, eq(projects.id, generatedFiles.projectId))
    .where(and(eq(generatedFiles.id, id), eq(projects.organizationId, org.id)))
    .limit(1)

  if (!file) {
    return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
  }

  return Response.redirect(await signedDownloadUrl(file.r2Key), 302)
}
