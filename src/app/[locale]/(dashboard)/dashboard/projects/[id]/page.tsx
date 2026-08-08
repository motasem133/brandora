import { eq } from 'drizzle-orm'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { AssistantPanel } from '@/components/features/assistant/assistant-panel'
import { BrandFonts } from '@/components/features/projects/brand-fonts'
import { BrandingView } from '@/components/features/projects/branding-view'
import { DeleteProjectButton } from '@/components/features/projects/delete-project-button'
import { GenerationPanel } from '@/components/features/projects/generation-panel'
import { IdentityPlate } from '@/components/features/projects/identity-plate'
import { SocialKit } from '@/components/features/projects/social-kit'
import { SocialView } from '@/components/features/projects/social-view'
import { WebsiteView } from '@/components/features/projects/website-view'
import { ArrowLeft, Download, MessageSquare, Palette } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Disclosure } from '@/components/ui/disclosure'
import { Link } from '@/i18n/navigation'
import { groupLogoRounds, resolveConcept, resolveRound } from '@/lib/logo-rounds'
import { CREDIT_COSTS, creditsForSections } from '@/server/billing/credits'
import { db } from '@/server/db'
import { getThreadMessages } from '@/server/db/queries/assistant'
import { getOrgPlan } from '@/server/db/queries/plans'
import { getProject } from '@/server/db/queries/projects'
import { brandingAssets, generatedFiles, socialMediaAssets, websiteAssets } from '@/server/db/schema'
import {
  getLatestJobForProject,
  sectionsForProject,
  sectionsToRun,
} from '@/server/services/generation'
import { requireOrg } from '@/server/session'

/**
 * A project, read as the brand book it produced.
 *
 * The page this replaces was a rail of four links beside a column of eight
 * panels of identical width and weight, with sixteen hundred pixels of empty
 * column running down the left of it. Nothing on it looked like the brand it
 * had generated — the customer's colours were five chips near the bottom of a
 * scroll, under Brandora's own purple.
 *
 * It is one document now. The identity plate opens it on the brand's own
 * ground, in the brand's own faces; the mark is decided beside the system it
 * has to agree with; and the things the run produced follow in the order
 * someone reads them, rather than hiding behind tabs that had to be discovered.
 */
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
  const { org, user } = await requireOrg()

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
   * The history, resolved once here so the strip and the canvas cannot disagree
   * about which round is open or which concept is standing on it.
   */
  const rounds = groupLogoRounds(logoFiles)
  const activeRound = resolveRound(rounds, round)
  const activeConcept = resolveConcept(
    activeRound,
    concept,
    brandingAsset?.primaryLogoFileId ?? null,
  )

  /*
   * Two different questions, and they were being answered with one value.
   *
   * `primaryId` is "what should be on the canvas", which falls back to the
   * newest round's first concept so the stage is never empty. `chosenId` is
   * "what did the customer actually decide", which stays null until they do.
   *
   * Blending them made the choose button read "Chosen" on a project where
   * nothing had been chosen — so it sat in its already-done state, did nothing
   * when pressed, and the decision could never be recorded. The favicon and
   * avatars are rebuilt by that action, so they never got rebuilt either.
   */
  const chosenId = brandingAsset?.primaryLogoFileId ?? null
  const primaryId = chosenId ?? rounds[0]?.concepts[0]?.id ?? null

  const primaryLogo = logoFiles.find((file) => file.id === primaryId)
  const kitFile = files.find((file) => file.kind === 'brand_kit_zip')

  // The social kit: finished posts in the order the layouts define, and the
  // one document that carries all of it.
  const kitPosts = files.filter((file) => file.kind === 'social_post')
  const kitPdf = files.find((file) => file.kind === 'brand_kit_pdf') ?? null

  const job = await getLatestJobForProject(project.id)
  /* What pressing the button will actually run, so the price beside it is the
     price that will be charged. After a partial run that is the unfinished
     sections, not the whole plan. */
  const sections = await sectionsToRun(project.id, sectionsForProject(project))

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
   * The assistant is a conversation, not a page of the book — so it takes the
   * whole stage rather than being appended to the end of the document. Reached
   * by a link and restored on refresh, which keeps it shareable and costs no
   * client state.
   */
  const onAssistant = tab === 'assistant' && canAssist

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/*
        App actions live in app chrome, above the plate and never on it. A
        gradient chrome button dropped onto a generated ground is exactly the
        clash the plate exists to avoid, and a destructive control has no
        business borrowing a customer's brand colour.
      */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-4 rtl:-scale-x-100" />
          {t('title')}
        </Link>

        <div className="flex items-center gap-1.5">
          {/*
            The assistant takes the whole stage, so it needs a door back to the
            brand. Without one the only exit was "Projects", which leaves the
            project altogether — a dead end dressed as navigation.
          */}
          {canAssist && (
            <Link
              href={`/dashboard/projects/${project.id}?tab=${onAssistant ? 'branding' : 'assistant'}`}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              {onAssistant ? <Palette /> : <MessageSquare />}
              {onAssistant ? t('tabs.branding') : t('tabs.assistant')}
            </Link>
          )}
          {kitFile && (
            /* Secondary: an export is downstream of the decision on the
               canvas, and outranked it as a full gradient fill. */
            <a
              href={`/api/files/${kitFile.id}?download`}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              <Download />
              {tb('downloadKit')}
            </a>
          )}
          <DeleteProjectButton projectId={project.id} />
        </div>
      </div>

      <BrandFonts fonts={brandingAsset?.fontRecommendations ?? null} />

      {/* The completion note scrolls here, so the brand needs a name to call. */}
      <div id="brand" className="scroll-mt-6">
        <IdentityPlate
          project={project}
          palette={brandingAsset?.colorPalette ?? null}
          fonts={brandingAsset?.fontRecommendations ?? null}
          slogan={brandingAsset?.slogan ?? null}
          logo={primaryLogo}
          locale={locale}
        />
      </div>

      <GenerationPanel
        projectId={project.id}
        sections={panelSections}
        initialStatus={project.status}
        initialProgress={job?.progress ?? {}}
        creditBalance={org.creditBalance}
        creditCost={creditsForSections(sections)}
        emailVerified={user.emailVerified}
        userEmail={user.email}
        brandName={project.businessName || project.title}
      />

      {/*
        Every deliverable on one scroll, in the order it is read.

        Behind tabs, the website and the social kit were things a customer had
        to already know existed. The product's claim is that one run produces
        all of it and that it agrees with itself, which is a claim a page can
        only make by putting the pieces next to each other.
      */}
      {onAssistant ? (
        <AssistantPanel projectId={project.id} initialMessages={history as never} />
      ) : (
        <>
      {brandingAsset && (
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
          chosenId={chosenId}
          language={project.language}
          emailVerified={user.emailVerified}
          userEmail={user.email}
        />
      )}

      {brandingAsset && (
        <SocialKit
          projectId={project.id}
          posts={kitPosts}
          pdf={kitPdf}
          hasLogo={Boolean(chosenId)}
          cost={CREDIT_COSTS.kit}
          creditBalance={org.creditBalance}
          isGenerating={isJobActive}
          emailVerified={user.emailVerified}
          userEmail={user.email}
          unlocked={Boolean(plan?.socialMediaKit)}
        />
      )}

      {websiteAsset && <WebsiteView website={websiteAsset} />}
      {socialAsset && <SocialView social={socialAsset} />}
        </>
      )}

      {/*
        The brief used to vanish the moment anything was generated, so the one
        question people ask of a result they dislike — "what did I actually ask
        for?" — became unanswerable. It stays, folded shut once there is work to
        read above it, and open when it is all there is.
      */}
      <Disclosure title={t('brief')} open={!brandingAsset}>
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
            <dt className="text-xs uppercase tracking-wide text-fg-muted">{t('briefAudience')}</dt>
            <dd className="mt-0.5 text-sm">{project.brandBrief}</dd>
          </div>
        </dl>
      </Disclosure>
    </div>
  )
}
