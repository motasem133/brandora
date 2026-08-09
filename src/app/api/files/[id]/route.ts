import { and, eq } from 'drizzle-orm'

import { db } from '@/server/db'
import { generatedFiles, projects } from '@/server/db/schema'
import { toErrorResponse } from '@/server/api-error'
import { getOrgPlan } from '@/server/db/queries/plans'
import { requireOrg } from '@/server/session'
import { signedDownloadUrl } from '@/server/storage/r2'

/**
 * Redirects to a short-lived signed URL for a generated file.
 *
 * The join through `projects` is the authorisation: a file is only reachable if
 * its project belongs to the caller's organization. Object keys are guessable,
 * so the bucket itself is never public for private assets.
 *
 * `?download` asks for it as a file rather than a page. The same route serves
 * both because it is also the `<img>` source wherever the bucket has no public
 * domain configured, and an image that arrives as an attachment does not
 * render — so saving has to be the request's choice, not the route's.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await handle(request, params)
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * What the file should be called once it is on someone's disk.
 *
 * Object keys are opaque — `logo-r2-wordmark.png` at best, a uuid path at
 * worst — and a folder of those is unusable. This names the business, what the
 * file is, and how big it is, which is what tells four near-identical PNGs
 * apart in a Downloads list.
 */
function downloadName(file: {
  kind: string
  r2Key: string
  width: number | null
  height: number | null
  metadata: Record<string, unknown>
  mimeType: string
}, projectTitle: string) {
  const slug = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const extension = file.r2Key.split('.').pop() ?? (file.mimeType.split('/')[1] || 'bin')
  const style = typeof file.metadata?.style === 'string' ? file.metadata.style : null
  const size = file.width && file.height ? `${file.width}x${file.height}` : null

  return [
    slug(projectTitle) || 'brandora',
    slug(file.kind),
    style ? slug(style) : null,
    size,
  ]
    .filter(Boolean)
    .join('-')
    .concat('.', extension)
}

async function handle(request: Request, params: Promise<{ id: string }>) {
  const { id } = await params
  const { org, user } = await requireOrg()

  /*
   * Support can look at a customer's files; nobody else can look at anybody's.
   *
   * The tenant check is still the join — it is only widened for an
   * administrator, and only because the alternative is a support screen made
   * entirely of broken images. Read from the session on the server, so it is
   * the database's answer about who is asking rather than anything the browser
   * can claim.
   */
  const isAdmin = user.role === 'admin'

  const [file] = await db
    .select({
      r2Key: generatedFiles.r2Key,
      kind: generatedFiles.kind,
      mimeType: generatedFiles.mimeType,
      width: generatedFiles.width,
      height: generatedFiles.height,
      metadata: generatedFiles.metadata,
      projectTitle: projects.title,
      organizationId: projects.organizationId,
    })
    .from(generatedFiles)
    .innerJoin(projects, eq(projects.id, generatedFiles.projectId))
    .where(
      isAdmin
        ? eq(generatedFiles.id, id)
        : and(eq(generatedFiles.id, id), eq(projects.organizationId, org.id)),
    )
    .limit(1)

  if (!file) {
    return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
  }

  /** Whose file this is, which is not always whose session this is. */
  const ownerOrgId = file.organizationId

  /*
   * The vector file is the one asset the plan actually gates.
   *
   * `vectorExport` has existed on the plans table since the beginning and was
   * never read, so every plan could download SVGs while the pricing page sold
   * them as a paid feature. Enforced here rather than in the UI because the
   * URL is guessable by anyone who can see the page.
   */
  if (file.kind === 'logo_svg' && !isAdmin) {
    /*
     * The owner's plan, not the viewer's. They are the same account in every
     * case except an administrator looking at somebody else's project — and an
     * admin checking whether the vector actually traced is exempt above,
     * because that is the question the screen exists to answer.
     */
    const plan = await getOrgPlan(ownerOrgId)
    if (!plan?.vectorExport) {
      return Response.json(
        { error: { code: 'FEATURE_LOCKED', message: 'SVG export is available on Creator and above.' } },
        { status: 403 },
      )
    }
  }

  const wantsDownload = new URL(request.url).searchParams.has('download')

  return Response.redirect(
    await signedDownloadUrl(file.r2Key, {
      filename: wantsDownload ? downloadName(file, file.projectTitle) : undefined,
    }),
    302,
  )
}
