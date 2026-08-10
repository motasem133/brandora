import { eq } from 'drizzle-orm'
import { ArrowLeft, Check, Minus, X } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { BrandCopy } from '@/components/features/projects/brand-copy'
import { BrandFonts } from '@/components/features/projects/brand-fonts'
import { IdentityPlate } from '@/components/features/projects/identity-plate'
import { PaletteGrid } from '@/components/features/projects/palette-grid'
import { SocialView } from '@/components/features/projects/social-view'
import { ContentLibrary } from '@/components/features/studio/content-library'
import { WebsiteView } from '@/components/features/projects/website-view'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Disclosure } from '@/components/ui/disclosure'
import { Table, TBody, TD, TH, THead } from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { formatDate } from '@/lib/utils'
import { groupLogoRounds } from '@/lib/logo-rounds'
import { db } from '@/server/db'
import { getProjectForAdmin, getProjectUsage } from '@/server/db/queries/admin'
import { brandingAssets, generatedFiles, socialMediaAssets, websiteAssets } from '@/server/db/schema'
import { getLatestJobForProject } from '@/server/services/generation'
import { publicUrl } from '@/server/storage/r2'

/**
 * A customer's project, for whoever has to answer "did it come out right?".
 *
 * Deliberately not the customer's own page rendered under a different
 * authorisation. That page is almost entirely controls — pick a name, choose a
 * logo, regenerate, ask the assistant, delete — and every one of them is an
 * `orgAction` scoped to the organization of whoever is signed in. Handed to an
 * administrator they would resolve against *their* workspace, so the kindest
 * outcome is a button that errors and the unkind one is a button that acts on
 * the wrong project. Support looks; it does not reach in.
 *
 * So this is the deliverables, read-only, with the thing the customer's page
 * has no reason to show: what was asked for set against what actually landed.
 * "Everything generated right" is not a feeling about a page, it is a list with
 * nothing missing from it.
 */
export default async function AdminProjectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Admin.projects')
  const tp = await getTranslations('Projects')
  const tb = await getTranslations('Branding')

  const project = await getProjectForAdmin(id)
  if (!project) notFound()

  const [branding, website, social, files, job, usage] = await Promise.all([
    db.select().from(brandingAssets).where(eq(brandingAssets.projectId, project.id)).limit(1),
    db.select().from(websiteAssets).where(eq(websiteAssets.projectId, project.id)).limit(1),
    db.select().from(socialMediaAssets).where(eq(socialMediaAssets.projectId, project.id)).limit(1),
    db.select().from(generatedFiles).where(eq(generatedFiles.projectId, project.id)),
    getLatestJobForProject(project.id),
    getProjectUsage(project.id),
  ])

  const brandingAsset = branding[0] ?? null
  const websiteAsset = website[0] ?? null
  const socialAsset = social[0] ?? null

  /*
   * Kit files only.
   *
   * Carousel frames are stored as `social_post` too — they are finished,
   * ready-to-post images, which is exactly what that kind means — and they
   * carry the content item they belong to. This checklist is what the *run*
   * produced, so a customer who made three carousels must not read as having
   * fifteen kit posts.
   */
  const of = (kind: string) =>
    files.filter((file) => file.kind === kind && !file.metadata?.contentItemId)
  const logoFiles = of('logo_raster')
  const rounds = groupLogoRounds(logoFiles)
  const chosenId = brandingAsset?.primaryLogoFileId ?? null
  const primaryLogo = logoFiles.find((file) => file.id === (chosenId ?? logoFiles[0]?.id))

  /*
   * The checklist, and the reason this screen exists.
   *
   * `asked` is what the customer's answers committed us to; `count` is what is
   * on disk. Sections nobody asked for read as such rather than as failures —
   * a brand with no website is only wrong if a website was wanted.
   */
  const checks: { label: string; asked: boolean; count: number }[] = [
    { label: t('branding'), asked: true, count: brandingAsset ? 1 : 0 },
    { label: t('logos'), asked: true, count: logoFiles.length },
    { label: t('vectors'), asked: true, count: of('logo_svg').length },
    {
      label: t('derived'),
      asked: true,
      count: of('favicon').length + of('social_avatar').length,
    },
    { label: t('website'), asked: project.needs_website, count: websiteAsset ? 1 : 0 },
    { label: t('social'), asked: project.needs_social_media, count: socialAsset ? 1 : 0 },
    { label: t('kitPosts'), asked: false, count: of('social_post').length },
    { label: t('kitPdf'), asked: false, count: of('brand_kit_pdf').length },
    { label: t('kitZip'), asked: false, count: of('brand_kit_zip').length },
  ]

  const steps = Object.entries((job?.progress ?? {}) as Record<string, { status: string; error?: string }>)

  const facts = [
    [t('owner'), project.owner_name ? `${project.owner_name} · ${project.owner_email}` : '—'],
    [t('workspace'), project.org_name],
    [t('plan'), project.plan_name ?? t('noPlan')],
    [t('balance'), String(project.credit_balance)],
    [t('modelSpend'), `$${(project.cost ?? 0).toFixed(4)}`],
    [tp('createdOn'), formatDate(project.created_at, locale)],
  ] as const

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          href="/admin/projects"
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-4 rtl:-scale-x-100" />
          {t('backToProjects')}
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">
              {project.business_name || project.title}
            </h1>
            <p className="mt-1 text-sm text-fg-secondary">{t('viewSubtitle')}</p>
          </div>
          <Badge
            tone={
              project.status === 'completed'
                ? 'success'
                : project.status === 'failed'
                  ? 'danger'
                  : project.status === 'partial'
                    ? 'warning'
                    : 'neutral'
            }
          >
            {tp(`status.${project.status}`)}
          </Badge>
        </div>

        <Card>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs uppercase tracking-wide text-fg-muted">{label}</dt>
                <dd className="mt-0.5 text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      {/* ------------------------------------------------------- the checklist */}
      <section className="space-y-3">
        <div>
          <CardTitle>{t('checkTitle')}</CardTitle>
          <CardDescription className="mt-1">{t('checkSubtitle')}</CardDescription>
        </div>

        <Card className="p-0">
          <Table caption={t('checkTitle')}>
            <THead>
              <TH>{t('delivered')}</TH>
              <TH align="end">{t('files')}</TH>
            </THead>
            <TBody>
              {checks.map((check) => {
                const ok = check.count > 0
                return (
                  <tr key={check.label}>
                    <TD>
                      <span className="inline-flex items-center gap-2">
                        {ok ? (
                          <Check className="size-4 shrink-0 text-success" />
                        ) : check.asked ? (
                          <X className="size-4 shrink-0 text-danger" />
                        ) : (
                          <Minus className="size-4 shrink-0 text-fg-muted" />
                        )}
                        <span className={ok ? undefined : 'text-fg-secondary'}>{check.label}</span>
                        {!ok && (
                          <span className="text-xs text-fg-muted">
                            {check.asked ? t('missing') : t('notRequested')}
                          </span>
                        )}
                      </span>
                    </TD>
                    <TD align="end" className="tabular-nums">
                      {check.count || '—'}
                    </TD>
                  </tr>
                )
              })}
            </TBody>
          </Table>
        </Card>

        <Card>
          <CardTitle className="text-base">{t('lastRun')}</CardTitle>
          {job ? (
            <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-fg-muted">{t('runSections')}</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {steps.length === 0 && <span className="text-sm text-fg-muted">—</span>}
                  {steps.map(([name, state]) => (
                    <Badge
                      key={name}
                      tone={
                        state.status === 'done'
                          ? 'success'
                          : state.status === 'failed'
                            ? 'danger'
                            : 'neutral'
                      }
                    >
                      {name}
                    </Badge>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-fg-muted">{t('runCharged')}</dt>
                <dd className="mt-1 text-sm tabular-nums">{job.creditsCharged}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-fg-muted">{t('runStatus')}</dt>
                <dd className="mt-1 text-sm">{job.status}</dd>
              </div>
              {job.error && (
                <div className="sm:col-span-3">
                  <dt className="text-xs uppercase tracking-wide text-fg-muted">{t('runError')}</dt>
                  <dd className="mt-1 text-sm text-danger">{job.error}</dd>
                </div>
              )}
            </dl>
          ) : (
            <CardDescription className="mt-2">{t('noRun')}</CardDescription>
          )}
        </Card>
      </section>

      {/* ----------------------------------------------------- the deliverables */}
      <BrandFonts fonts={brandingAsset?.fontRecommendations ?? null} />

      {/* Assembled rather than cast: this row comes from a join across four
          tables and carries snake_case columns, so the fields the plate reads
          are named explicitly and the date is a Date. */}
      <IdentityPlate
        project={{
          businessName: project.business_name,
          title: project.title,
          language: project.language,
          industry: project.industry,
          country: project.country,
          createdAt: new Date(project.created_at),
        }}
        as="h2"
        palette={brandingAsset?.colorPalette ?? null}
        fonts={brandingAsset?.fontRecommendations ?? null}
        slogan={brandingAsset?.slogan ?? null}
        logo={primaryLogo}
        locale={locale}
      />

      {/*
        The written brand, which this screen never showed.

        It listed the branding row as delivered and then never printed a word
        of it — so the one question support is actually asked, "their story is
        missing / their colours are wrong", could only be answered by reading
        the database. Two free-plan brands were checked that way before anyone
        noticed the screen simply had no place to show it.

        The customer's own component in read-only mode, and the customer's own
        palette grid: the swatches copy their hex, which is exactly what
        somebody answering that question wants in their hands. Nothing here
        writes — see the note at the top of this file.
      */}
      {brandingAsset && (
        <section className="space-y-4">
          <CardTitle>{t('branding')}</CardTitle>

          <Card className="space-y-6">
            <BrandCopy
              readOnly
              projectId={project.id}
              slogan={brandingAsset.slogan}
              brandStory={brandingAsset.brandStory}
              brandVoice={brandingAsset.brandVoice}
              brandValues={brandingAsset.brandValues}
            />

            {brandingAsset.colorPalette && (
              <div>
                <h3 className="text-xs uppercase tracking-wide text-fg-muted">{tb('palette')}</h3>
                <div className="mt-2">
                  <PaletteGrid palette={brandingAsset.colorPalette} />
                </div>
              </div>
            )}
          </Card>
        </section>
      )}

      {logoFiles.length > 0 && (
        <section className="space-y-3">
          <CardTitle>{t('logoRounds')}</CardTitle>
          {rounds.map((round) => (
            <Card key={round.round} className="space-y-3">
              {/* The direction that produced the round, where there was one —
                  which is the first thing to read when a mark looks wrong. */}
              <CardDescription>
                {t('roundLabel', { n: round.round })}
                {round.brief ? ` · ${round.brief}` : ''}
              </CardDescription>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {round.concepts.map((file) => (
                  <figure key={file.id} className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a customer
                        asset on R2, sized by whatever the model produced; the optimizer
                        would need every one of these hosts allow-listed. */}
                    <img
                      src={publicUrl(file.r2Key) ?? `/api/files/${file.id}`}
                      alt={String(file.metadata?.style ?? '')}
                      className="w-full rounded-card border border-line bg-white"
                    />
                    <figcaption className="flex items-center justify-between text-xs text-fg-muted">
                      <span className="capitalize">{String(file.metadata?.style ?? '—')}</span>
                      {file.id === chosenId && <Badge tone="success">{t('chosen')}</Badge>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Card>
          ))}
        </section>
      )}

      {of('social_post').length > 0 && (
        <section className="space-y-3">
          <CardTitle>{t('kitPosts')}</CardTitle>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {of('social_post').map((file) => (
              /* eslint-disable-next-line @next/next/no-img-element -- see above. */
              <img
                key={file.id}
                src={publicUrl(file.r2Key) ?? `/api/files/${file.id}`}
                alt={String(file.metadata?.layout ?? '')}
                className="w-full rounded-card border border-line"
              />
            ))}
          </div>
        </section>
      )}

      {websiteAsset && <WebsiteView website={websiteAsset} readOnly />}
      {socialAsset && <SocialView social={socialAsset} />}

      {/*
        Content Studio, without which this screen is not everything the
        customer sees.

        The brand is generated once; the Studio is where they keep coming back,
        so by the time anyone writes in about their content it is the part with
        the most in it — and it was the one deliverable missing here. The
        customer's own component, given the project rather than the workspace,
        so it lists this brand's pieces and drops the brand name from every row.
      */}
      <section className="space-y-3">
        <CardTitle>{t('contentTitle')}</CardTitle>
        <ContentLibrary
          organizationId={project.organization_id}
          projectId={project.id}
          emptyBody={t('contentNone')}
        />
      </section>

      {/* ------------------------------------------------------- what they asked */}
      <Disclosure title={tp('brief')} open={!brandingAsset}>
        <dl className="grid gap-4 sm:grid-cols-2">
          {[
            [tp('briefIndustry'), project.industry],
            [tp('briefCountry'), project.country],
            [tp('briefStyle'), project.brand_style],
            [tp('briefLanguage'), project.language === 'ar' ? 'العربية' : 'English'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-wide text-fg-muted">{label}</dt>
              <dd className="mt-0.5 text-sm capitalize">{value}</dd>
            </div>
          ))}
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-fg-muted">{tp('briefAudience')}</dt>
            <dd className="mt-0.5 text-sm">{project.brand_brief}</dd>
          </div>
          {project.logo_brief && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-fg-muted">{t('logos')}</dt>
              <dd className="mt-0.5 text-sm">{project.logo_brief}</dd>
            </div>
          )}
        </dl>
      </Disclosure>

      {/* -------------------------------------------------------- what it cost */}
      <section className="space-y-3">
        <div>
          <CardTitle>{t('usageTitle')}</CardTitle>
          <CardDescription className="mt-1">{t('usageSubtitle')}</CardDescription>
        </div>
        <Card className="p-0">
          {usage.length === 0 ? (
            <CardDescription className="p-6">{t('usageNone')}</CardDescription>
          ) : (
            <Table caption={t('usageTitle')}>
              <THead>
                <TH>{t('usageFeature')}</TH>
                <TH>{t('usageModel')}</TH>
                <TH>{t('usageStatus')}</TH>
                <TH align="end">{t('usageLatency')}</TH>
                <TH align="end">{t('usageCost')}</TH>
              </THead>
              <TBody>
                {usage.map((row, index) => (
                  <tr key={index}>
                    <TD className="capitalize">{row.feature}</TD>
                    <TD className="text-fg-secondary">{row.model}</TD>
                    <TD>
                      <Badge tone={row.status === 'success' ? 'success' : 'danger'}>
                        {row.status}
                      </Badge>
                    </TD>
                    <TD align="end" className="tabular-nums">
                      {(row.latency_ms / 1000).toFixed(1)}s
                    </TD>
                    <TD align="end" className="tabular-nums">
                      ${(row.cost ?? 0).toFixed(4)}
                    </TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </section>
    </div>
  )
}
