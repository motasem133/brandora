import { eq } from 'drizzle-orm'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { AssistantPanel } from '@/components/features/assistant/assistant-panel'
import { BrandingView } from '@/components/features/projects/branding-view'
import { DeleteProjectButton } from '@/components/features/projects/delete-project-button'
import { GenerationPanel } from '@/components/features/projects/generation-panel'
import { ProjectRail, type ProjectSection } from '@/components/features/projects/project-rail'
import { SocialView } from '@/components/features/projects/social-view'
import { WebsiteView } from '@/components/features/projects/website-view'
import { ArrowLeft, Download, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Disclosure } from '@/components/ui/disclosure'
import { Link } from '@/i18n/navigation'
import { groupLogoRounds, resolveConcept, resolveRound } from '@/lib/logo-rounds'
import { formatDate } from '@/lib/utils'
import { publicUrl } from '@/server/storage/r2'
import { CREDIT_COSTS, creditsForSections } from '@/server/billing/credits'
import { db } from '@/server/db'
import { getThreadMessages } from '@/server/db/queries/assistant'
import { getOrgPlan } from '@/server/db/queries/plans'
import { getProject } from '@/server/db/queries/projects'
import { brandingAssets, generatedFiles, socialMediaAssets, websiteAssets } from '@/server/db/schema'
import { getLatestJobForProject, sectionsForProject } from '@/server/services/generation'
import { requireOrg } from '@/server/session'

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ tab?: string; round?: string; concept?: string }>
}) {
  const { locale, id } = await params
  const { tab, round, concept } = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations('Projects')
  const tb = await getTranslations('Branding')
  const { org } = await requireOrg()

  // getProject is org-scoped, so a project from another tenant reads as 404.
  const project = await getProject(org.id, id)
  if (!project) notFound()

  const [branding, website, social] = await Promise.all([
    db.select().from(brandingAssets).where(eq(brandingAssets.projectId, project.id)).limit(1),
    db.select().from(websiteAssets).where(eq(websiteAssets.projectId, project.id)).limit(1),
    db.select().from(socialMediaAssets).where(eq(socialMediaAssets.projectId, project.id)).limit(1),
  ])

  const files = await db
    .select()
    .from(generatedFiles)
    .where(eq(generatedFiles.projectId, project.id))

  const logoFiles = files.filter((file) => file.kind === 'logo_raster')

  const brandingAsset = branding[0]
  const websiteAsset = website[0]
  const socialAsset = social[0]

  /*
   * The history, resolved once here so the rail and the canvas cannot disagree
   * about which round is open or which concept is standing on it.
   */
  const rounds = groupLogoRounds(logoFiles)
  const activeRound = resolveRound(rounds, round)
  const activeConcept = resolveConcept(
    activeRound,
    concept,
    brandingAsset?.primaryLogoFileId ?? null,
  )

  // Undecided falls back to the newest round's first concept, which is what the
  // rest of the system already assumes.
  const primaryId = brandingAsset?.primaryLogoFileId ?? rounds[0]?.concepts[0]?.id ?? null

  // The mark the customer chose, for the identity block in the header.
  const primaryLogo = logoFiles.find((file) => file.id === primaryId)
  const kitFile = files.find((file) => file.kind === 'brand_kit_zip')

  const job = await getLatestJobForProject(project.id)
  const sections = sectionsForProject(project)

  /*
   * While a job is running, show the steps that job is actually doing.
   * Regenerating only the logos otherwise rendered four steps with three stuck
   * on "pending" forever, which reads as a stalled generation.
   */
  const isJobActive = job?.status === 'queued' || job?.status === 'running'
  const panelSections = isJobActive && job.sections.length ? job.sections : sections
  const plan = await getOrgPlan(org.id)

  // The assistant only makes sense once there is a brand to refine, and it is
  // a paid feature — so the section appears only when both are true.
  const canAssist = Boolean(plan?.brandAssistant) && Boolean(brandingAsset)
  const history = canAssist ? await getThreadMessages(project.id) : []

  /*
   * Built in one pass and never mutated afterwards. Pushing a section in later
   * left `active` derived from a shorter list, so the assistant rendered but
   * could never be selected — it always fell back to the first one.
   */
  const available: ProjectSection[] = [
    ...(brandingAsset ? (['branding'] as const) : []),
    ...(websiteAsset ? (['website'] as const) : []),
    ...(socialAsset ? (['social'] as const) : []),
    ...(canAssist ? (['assistant'] as const) : []),
  ]

  const requested = tab as ProjectSection | undefined
  const active: ProjectSection =
    requested && available.includes(requested) ? requested : (available[0] ?? 'branding')

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/*
        A way back out. The project page is reachable from a card, a redirect
        after generation and a shared link, and the sidebar's "Projects" entry
        was the only exit — which is a long way to travel for "not this one".
      */}
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" />
        {t('title')}
      </Link>

      {/*
        The identity block answers "which brand am I in" before anything else.
        The chosen mark carries that faster than the title does, so it leads —
        and where no logo exists yet, its absence is the state.
      */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-card border border-line bg-white">
            {primaryLogo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={publicUrl(primaryLogo.r2Key) ?? `/api/files/${primaryLogo.id}`}
                alt=""
                className="size-full object-contain p-1.5"
              />
            ) : (
              <Sparkles className="size-5 text-fg-muted" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-2xl font-semibold tracking-[-0.02em]">
                {project.businessName || project.title}
              </h1>
              <Badge tone={project.status === 'completed' ? 'success' : 'neutral'}>
                {t(`status.${project.status}`)}
              </Badge>
            </div>
            <p className="mt-1 truncate text-sm text-fg-secondary">
              {project.industry} · {project.country} ·{' '}
              {t('createdOn', { date: formatDate(project.createdAt, locale) })}
            </p>
          </div>
        </div>

        {/*
          The kit is the thing the customer came for, and it was a small link
          buried in the middle of the logo card. It is a project-level artifact,
          so it lives with the project, and delete steps back to an icon.
        */}
        <div className="flex items-center gap-1.5">
          {kitFile && (
            <a href={`/api/files/${kitFile.id}`} className={buttonVariants({ size: 'sm' })}>
              <Download />
              {tb('downloadKit')}
            </a>
          )}
          <DeleteProjectButton projectId={project.id} />
        </div>
      </div>

      <GenerationPanel
        projectId={project.id}
        sections={panelSections}
        initialStatus={project.status}
        initialProgress={job?.progress ?? {}}
        creditBalance={org.creditBalance}
        creditCost={creditsForSections(sections)}
      />

      {/*
        Rail beside stage from large up, stacked above it on a phone. The rail
        is sticky, so the section list and the logo history stay reachable
        however far down the sheet the customer has scrolled.
      */}
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        {available.length > 0 && (
          <div className="mb-6 lg:sticky lg:top-24 lg:mb-0">
            <ProjectRail
              projectId={project.id}
              active={active}
              available={available}
              rounds={rounds}
              activeRound={activeRound?.round}
              primaryLogoFileId={primaryId}
              locale={locale}
            />
          </div>
        )}

        <div className="min-w-0 space-y-6">
          {active === 'branding' && brandingAsset && (
            <BrandingView
              branding={brandingAsset}
              files={files}
              projectId={project.id}
              chosenName={project.businessName}
              creditBalance={org.creditBalance}
              logoCost={CREDIT_COSTS.logos}
              logoBrief={project.logoBrief}
              isGenerating={isJobActive}
              rounds={rounds}
              activeRound={activeRound}
              activeConcept={activeConcept}
              primaryId={primaryId}
            />
          )}
          {active === 'website' && websiteAsset && <WebsiteView website={websiteAsset} />}
          {active === 'social' && socialAsset && <SocialView social={socialAsset} />}
          {active === 'assistant' && canAssist && (
            <AssistantPanel projectId={project.id} initialMessages={history as never} />
          )}

          {/*
            The brief used to vanish the moment anything was generated, so the
            one question people ask of a result they dislike — "what did I
            actually ask for?" — became unanswerable. It stays, folded shut once
            there is work to read above it, and open when it is all there is.
          */}
          <Disclosure title={t('brief')} open={available.length === 0}>
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                [t('briefIndustry'), project.industry],
                [t('briefCountry'), project.country],
                [t('briefStyle'), project.brandStyle],
                [t('briefLanguage'), project.language === 'ar' ? 'العربية' : 'English'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs uppercase tracking-wide text-fg-muted">{label}</dt>
                  <dd className="mt-0.5 text-sm capitalize">{value}</dd>
                </div>
              ))}
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-fg-muted">
                  {t('briefAudience')}
                </dt>
                <dd className="mt-0.5 text-sm">{project.targetAudience}</dd>
              </div>
            </dl>
          </Disclosure>
        </div>
      </div>
    </div>
  )
}
