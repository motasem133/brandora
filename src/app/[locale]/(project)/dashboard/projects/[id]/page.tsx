import { eq } from 'drizzle-orm'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { AssistantPanel } from '@/components/features/assistant/assistant-panel'
import { BrandFonts } from '@/components/features/projects/brand-fonts'
import { BrandingView } from '@/components/features/projects/branding-view'
import {
  FactsSheet,
  LockedTile,
  MarkSheet,
  PaletteSheet,
  TextSheet,
  ThumbsSheet,
  Tile,
  TileGrid,
  TypeSheet,
} from '@/components/features/projects/brand-tiles'
import { DeleteProjectButton } from '@/components/features/projects/delete-project-button'
import { GenerationPanel } from '@/components/features/projects/generation-panel'
import { IdentityPlate } from '@/components/features/projects/identity-plate'
import { SocialKit } from '@/components/features/projects/social-kit'
import type { LockedFeature } from '@/components/features/projects/brand-complete'
import { KitMockup, VectorMockup, WebsiteMockup } from '@/components/features/projects/brand-mockups'
import { SocialView } from '@/components/features/projects/social-view'
import { SiteMessages } from '@/components/features/projects/site-messages'
import { WebsiteView } from '@/components/features/projects/website-view'
import { ContentLibrary } from '@/components/features/studio/content-library'
import { ArrowLeft, Download, MessageSquare, Palette, PenLine } from 'lucide-react'
import { brandTheme, fontStack } from '@/lib/brand-theme'

import { buttonVariants } from '@/components/ui/button'
import { Disclosure } from '@/components/ui/disclosure'
import { Link } from '@/i18n/navigation'
import { groupLogoRounds, resolveConcept, resolveRound } from '@/lib/logo-rounds'
import { CREDIT_COSTS, creditsForSections, mustVerifyEmail } from '@/server/billing/credits'
import { db } from '@/server/db'
import { getThreadMessages } from '@/server/db/queries/assistant'
import { getOrgPlan } from '@/server/db/queries/plans'
import { getProject } from '@/server/db/queries/projects'
import { brandingAssets, generatedFiles, socialMediaAssets, websiteAssets } from '@/server/db/schema'
import { publicUrl } from '@/server/storage/r2'
import {
  getLatestJobForProject,
  sectionsCarryingName,
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
 * Replacing it with one long document fixed the navigation and created a worse
 * problem: eight thousand pixels of tools, with the brand distributed through
 * them. Everything was reachable and nothing was visible.
 *
 * So the page is a wall. It opens on every artefact this brand has, at a size
 * worth judging, with the gaps hanging in the same frames as the work — one
 * screen that answers "what do I have?". Each sheet opens its working view
 * below through `?open=`, which keeps the tools one press away, survives a
 * reload, and can be linked to. The order of the wall is the order someone
 * reads a brand; the order of the tools is whichever one they pressed.
 */
export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ tab?: string; round?: string; concept?: string; open?: string }>
}) {
  const { locale, id } = await params
  const { tab, round, concept, open } = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations('Projects')
  const tb = await getTranslations('Branding')
  /* The pins reuse the completion panel's copy: it already names each locked
     deliverable and what it is for, in the product's own words. */
  const tg = await getTranslations('Generation')
  const tst = await getTranslations('Studio')
  const tw = await getTranslations('Website')
  const { org, user } = await requireOrg()

  // getProject is org-scoped, so a project from another tenant reads as 404.
  const project = await getProject(org.id, id)
  if (!project) notFound()

  /*
   * One wait, not six.
   *
   * Nothing below needs anything above it — they all hang off `project`, which
   * is already resolved — but they were awaited one after another, so the page
   * paid six sequential database round trips before it rendered a pixel. On a
   * hosted database that is most of the time it takes to change tabs here.
   * `getThreadMessages` stays behind, because whether to ask for it at all
   * depends on the plan.
   */
  const [branding, website, social, files, job, sections, plan, mustVerify] = await Promise.all([
    db.select().from(brandingAssets).where(eq(brandingAssets.projectId, project.id)).limit(1),
    db.select().from(websiteAssets).where(eq(websiteAssets.projectId, project.id)).limit(1),
    db.select().from(socialMediaAssets).where(eq(socialMediaAssets.projectId, project.id)).limit(1),
    db.select().from(generatedFiles).where(eq(generatedFiles.projectId, project.id)),
    getLatestJobForProject(project.id),
    /* What pressing the button will actually run, so the price beside it is the
       price that will be charged. After a partial run that is the unfinished
       sections, not the whole plan. */
    sectionsToRun(project.id, sectionsForProject(project)),
    getOrgPlan(org.id),
    /* Not `user.emailVerified`: the first run is allowed unverified, so what
       every control below has to know is whether this account has had it. */
    mustVerifyEmail(org.id, user.emailVerified),
  ])

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

  /*
   * While a job is running, show the steps that job is actually doing.
   * Regenerating only the logos otherwise rendered four steps with three stuck
   * on "pending" forever, which reads as a stalled generation.
   */
  const isJobActive = job?.status === 'queued' || job?.status === 'running'
  const panelSections = isJobActive && job.sections.length ? job.sections : sections

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

  /*
   * The completion moment's material.
   *
   * Built here rather than inside the panel because the previews are server
   * components — the same reason `SocialKit` takes its `lockedPreview` as a
   * prop. The panel decides *whether* the moment happens; this decides what it
   * has to show.
   *
   * Only what the plan actually withholds, and only where there is a brand to
   * draw it in. A customer who could have had a website and said no at the
   * wizard is not locked out of anything — that is the same distinction the
   * locked website section below already makes, and telling them otherwise
   * would be a lie with a price attached.
   */
  const lockedCandidates: (LockedFeature | null)[] = brandingAsset
    ? [
        plan?.websiteBuilder ? null : {
          key: 'website',
          preview: (
            <WebsiteMockup
              palette={brandingAsset.colorPalette}
              fonts={brandingAsset.fontRecommendations}
              logo={primaryLogo}
              name={project.businessName || project.title}
              slogan={brandingAsset.slogan}
              language={project.language}
            />
          ),
        },
        plan?.socialMediaKit ? null : {
          key: 'kit',
          preview: (
            <KitMockup
              palette={brandingAsset.colorPalette}
              fonts={brandingAsset.fontRecommendations}
              logo={primaryLogo}
              name={project.businessName || project.title}
            />
          ),
        },
        plan?.vectorExport ? null : {
          key: 'vector',
          preview: <VectorMockup palette={brandingAsset.colorPalette} logo={primaryLogo} />,
        },
      ]
    : []

  const lockedFeatures = lockedCandidates.filter(
    (feature): feature is LockedFeature => feature !== null,
  )

  /*
   * What a rename would leave behind.
   *
   * `sectionsCarryingName` is used for both the sentence and the price, rather
   * than filtering it down to the sections that happen to have output already.
   * Those are two different questions and answering them with two different
   * lists is how the price beside a control stops being the price that is
   * charged — the action runs exactly this set, so this is exactly what it
   * costs. The same rule `sectionsToRun` is used for above.
   *
   * Absent entirely until a run has produced something, because a warning that
   * fires on the first name anyone picks is one people learn to dismiss without
   * reading — and at that point nothing carries the old name anyway.
   */
  const hasGeneratedWork =
    logoFiles.length > 0 || Boolean(websiteAsset) || Boolean(socialAsset)

  const nameSections = sectionsCarryingName(project)

  /* Not `project.businessName` alone: until a name is chosen, everything
     downstream was drawn with the first idea, so that is the name the work
     actually carries and re-choosing it must not warn about itself. */
  const nameOnTheWork =
    project.businessName || brandingAsset?.businessNameIdeas[0]?.name || null

  const renameImpact =
    hasGeneratedWork && nameOnTheWork && nameSections.length > 0
      ? {
          carries: nameOnTheWork,
          sections: nameSections,
          cost: creditsForSections(nameSections),
          balance: org.creditBalance,
          mustVerify,
          isGenerating: isJobActive,
        }
      : undefined

  /* The palette as the plate draws it along its base — the brand's colours, not
     its ground, for the reason `IdentityPlate` documents. */
  const brandSwatches = brandingAsset?.colorPalette
    ? [
        brandingAsset.colorPalette.primary,
        brandingAsset.colorPalette.secondary,
        brandingAsset.colorPalette.accent,
        brandingAsset.colorPalette.text,
      ]
    : []

  /* The brand's own ground and faces, for the sheets that *are* the brand.
     Every variable is `--guest-*`; chrome tokens are not shadowable by
     generated input, for the reason `brand-theme` sets out at length. */
  const theme = brandTheme(brandingAsset?.colorPalette ?? null)
  const brandName = project.businessName || project.title

  /* The same order and the same emptiness rule the website section itself uses,
     so the sheet and the view below it cannot disagree about what exists. */
  const sitePages = (['home', 'about', 'services', 'contact'] as const)
    .map((name) => ({
      name,
      blocks: ((websiteAsset?.pages ?? {}) as Record<string, unknown[]>)[name]?.length ?? 0,
    }))
    .filter((page) => page.blocks > 0)
    .slice(0, 4)

  /*
   * Which working view is open, if any.
   *
   * Read from the URL rather than held in state so a link to one artefact is a
   * link somebody can send, and an unknown value closes everything instead of
   * rendering a section that does not exist.
   */
  const OPEN_KEYS = ['identity', 'kit', 'website', 'copy', 'content', 'brief'] as const
  const opened = OPEN_KEYS.find((key) => key === open) ?? null

  const sheet = (key: string | null) =>
    key ? `/dashboard/projects/${project.id}?open=${key}#open` : `/dashboard/projects/${project.id}`

  /* The brief reads the same whether it is the whole page or one sheet's view,
     so it is written once. */
  const brief = (
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
  )

  return (
    <div className="space-y-7">
      {/*
        App actions live in app chrome, above the plate and never on it. A
        gradient chrome button dropped onto a generated ground is exactly the
        clash the plate exists to avoid, and a destructive control has no
        business borrowing a customer's brand colour.
      */}
      {/* The rail carries the way back now, so this row is actions only and
          sits to the end of the panel rather than straddling it. */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-1.5">
          {/*
            The assistant takes the whole stage, so it needs a door back to the
            brand. Without one the only exit was "Projects", which leaves the
            project altogether — a dead end dressed as navigation.
          */}
          {canAssist && (
            <Link
              href={`/dashboard/projects/${project.id}?tab=${onAssistant ? 'branding' : 'assistant'}`}
              /* Same reason as the app bar's tabs: this page is dynamic, so
                 without this the switch renders it from cold on the press. */
              unstable_dynamicOnHover
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
        mustVerify={mustVerify}
        userEmail={user.email}
        brandName={project.businessName || project.title}
        brandLogoUrl={
          primaryLogo ? (publicUrl(primaryLogo.r2Key) ?? `/api/files/${primaryLogo.id}`) : null
        }
        brandSwatches={brandSwatches}
        lockedFeatures={lockedFeatures}
      />

      {/*
        The wall, and the tools one press behind it.

        `open` is read rather than trusted: an unknown value falls back to the
        wall with nothing open, so a stale or hand-typed link lands somewhere
        rather than on an empty page.
      */}
      {onAssistant ? (
        <AssistantPanel projectId={project.id} initialMessages={history as never} />
      ) : (
        <>
          {brandingAsset && (
            <TileGrid>
              {primaryLogo && (
                <Tile
                  href={sheet('identity')}
                  title={tb('logos')}
                  meta={tb('fileCount', { count: logoFiles.length })}
                  active={opened === 'identity'}
                  guest
                  vars={theme.vars}
                >
                  <MarkSheet logo={primaryLogo} alt={brandName} darkPaper={theme.isDark} />
                </Tile>
              )}

              <Tile
                href={sheet('identity')}
                title={tb('palette')}
                active={opened === 'identity'}
                guest
                vars={theme.vars}
              >
                <PaletteSheet swatches={brandSwatches} />
              </Tile>

              <Tile
                href={sheet('identity')}
                title={tb('fonts')}
                meta={brandingAsset.fontRecommendations?.heading}
                active={opened === 'identity'}
                guest
                vars={theme.vars}
              >
                <TypeSheet
                  name={brandName}
                  slogan={brandingAsset.slogan}
                  heading={fontStack(brandingAsset.fontRecommendations?.heading)}
                  body={fontStack(brandingAsset.fontRecommendations?.body)}
                />
              </Tile>

              {brandingAsset.brandStory && (
                <Tile
                  href={sheet('identity')}
                  title={tb('story')}
                  active={opened === 'identity'}
                  guest
                  vars={theme.vars}
                >
                  <TextSheet
                    body={brandingAsset.brandStory}
                    font={fontStack(brandingAsset.fontRecommendations?.body)}
                  />
                </Tile>
              )}

              {socialAsset?.instagramBio && (
                <Tile
                  href={sheet('copy')}
                  title={tb('copy')}
                  active={opened === 'copy'}
                  guest
                  vars={theme.vars}
                >
                  <TextSheet
                    body={socialAsset.instagramBio}
                    font={fontStack(brandingAsset.fontRecommendations?.body)}
                  />
                </Tile>
              )}

              {/*
                The kit is three sheets in one slot, because it is three states:
                made, buyable, and available but not run yet. Only the middle one
                is a gap — the last is a button that has not been pressed, and
                drawing it as a locked frame would be selling somebody something
                they already own.
              */}
              {kitPosts.length > 0 ? (
                <Tile
                  href={sheet('kit')}
                  title={tb('kit')}
                  meta={tb('fileCount', { count: kitPosts.length + (kitPdf ? 1 : 0) })}
                  active={opened === 'kit'}
                >
                  <ThumbsSheet files={kitPosts} alt={tb('kit')} />
                </Tile>
              ) : !plan?.socialMediaKit ? (
                <LockedTile
                  title={tb('kit')}
                  meta={tb('pinCredits', { credits: CREDIT_COSTS.kit })}
                  benefit={tg('locked.kit.benefit')}
                  action={tb('generateIt')}
                  price={tb('kitLocked')}
                />
              ) : (
                <Tile
                  href={sheet('kit')}
                  title={tb('kit')}
                  meta={tb('pinCredits', { credits: CREDIT_COSTS.kit })}
                  active={opened === 'kit'}
                >
                  <TextSheet body={tb('kitHint')} />
                </Tile>
              )}

              {/*
                A website that was never asked for is not a gap. The pin appears
                only when the plan is what is missing — the same distinction the
                section below has always made, and the reason is that telling
                somebody they are locked out of a thing they declined is a lie
                with a price attached.
              */}
              {websiteAsset ? (
                <Tile
                  href={sheet('website')}
                  title={tb('website')}
                  /* Where it is, or that it is nowhere — the one thing anyone
                     wants from a website at a glance. */
                  meta={
                    websiteAsset.isPublished && websiteAsset.subdomain
                      ? websiteAsset.subdomain
                      : tw('notPublished')
                  }
                  active={opened === 'website'}
                >
                  <FactsSheet
                    rows={sitePages.map((page) => [
                      tw(`pages.${page.name}`),
                      tw('blockCount', { count: page.blocks }),
                    ])}
                  />
                </Tile>
              ) : !plan?.websiteBuilder ? (
                <LockedTile
                  title={tb('website')}
                  meta={tb('pinCredits', { credits: CREDIT_COSTS.website })}
                  benefit={tg('locked.website.benefit')}
                  action={tb('generateIt')}
                  price={tb('websiteLocked')}
                />
              ) : null}

              <Tile
                href={sheet('content')}
                title={t('contentTitle')}
                active={opened === 'content'}
              >
                <TextSheet body={tst('emptyBodyBrand')} />
              </Tile>

              <Tile href={sheet('brief')} title={t('brief')} active={opened === 'brief'}>
                <TextSheet body={project.brandBrief} />
              </Tile>
            </TileGrid>
          )}

          {/*
            The working view for whichever sheet was pressed.

            One at a time, deliberately. The point of the wall is that the page
            has a size; rendering two of these under it puts the scroll straight
            back.
          */}
          {opened && (
            <section id="open" className="scroll-mt-6 space-y-6">
              <Link
                href={sheet(null)}
                unstable_dynamicOnHover
                className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
              >
                <ArrowLeft className="size-4 rtl:-scale-x-100" />
                {tb('backToBrand')}
              </Link>

              {opened === 'identity' && brandingAsset && (
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
                  mustVerify={mustVerify}
                  vectorExport={Boolean(plan?.vectorExport)}
                  userEmail={user.email}
                  renameImpact={renameImpact}
                />
              )}

              {opened === 'kit' && brandingAsset && (
                <SocialKit
                  projectId={project.id}
                  posts={kitPosts}
                  pdf={kitPdf}
                  hasLogo={Boolean(chosenId)}
                  cost={CREDIT_COSTS.kit}
                  creditBalance={org.creditBalance}
                  isGenerating={isJobActive}
                  mustVerify={mustVerify}
                  userEmail={user.email}
                  unlocked={Boolean(plan?.socialMediaKit)}
                />
              )}

              {/* The site and the messages it was written from, together — they
                  were two sections asking to be read as one. */}
              {opened === 'website' && websiteAsset && (
                <>
                  <WebsiteView website={websiteAsset} />
                  <SiteMessages projectId={project.id} locale={locale} />
                </>
              )}

              {opened === 'copy' && socialAsset && <SocialView social={socialAsset} />}

              {opened === 'content' && (
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-semibold">{t('contentTitle')}</h2>
                    {/*
                      `?brand=` is the Studio's own parameter, resolved on the
                      server — so this arrives with the brand already chosen and
                      the picker already showing it, rather than landing on
                      someone else's.
                    */}
                    <Link
                      href={`/dashboard/studio?brand=${project.id}`}
                      className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                    >
                      <PenLine />
                      {tst('generate')}
                    </Link>
                  </div>

                  {/*
                    No Suspense boundary, deliberately, and it is not a style
                    choice. A boundary that re-suspends inside a React transition
                    blocks the whole transition from committing, and
                    `router.refresh()` is a transition — so every save on this
                    page wrote to the database, refreshed, received a correct
                    payload and painted none of it. It reproduced two times in
                    three. What the boundary bought was the wait on one indexed
                    query, measured at 1–22ms.
                  */}
                  <ContentLibrary
                    organizationId={org.id}
                    projectId={project.id}
                    limit={10}
                    emptyBody={tst('emptyBodyBrand')}
                  />
                </section>
              )}

              {opened === 'brief' && brief}
            </section>
          )}

          {/*
            Before the first run there is no wall — so the brief is the page,
            open, rather than a sheet hanging on nothing.
          */}
          {!brandingAsset && (
            <Disclosure title={t('brief')} open>
              {brief}
            </Disclosure>
          )}
        </>
      )}
    </div>
  )
}
