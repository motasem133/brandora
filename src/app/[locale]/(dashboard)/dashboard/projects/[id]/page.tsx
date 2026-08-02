import { eq } from 'drizzle-orm'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { AssistantPanel } from '@/components/features/assistant/assistant-panel'
import { BrandingView } from '@/components/features/projects/branding-view'
import { DeleteProjectButton } from '@/components/features/projects/delete-project-button'
import { GenerationPanel } from '@/components/features/projects/generation-panel'
import { ProjectTabs, type ProjectTab } from '@/components/features/projects/project-tabs'
import { SocialView } from '@/components/features/projects/social-view'
import { WebsiteView } from '@/components/features/projects/website-view'
import { Badge } from '@/components/ui/badge'
import { Card, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { creditsForSections } from '@/server/billing/credits'
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
  searchParams: Promise<{ tab?: string }>
}) {
  const { locale, id } = await params
  const { tab } = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations('Projects')
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
  const kitFile = files.find((file) => file.kind === 'brand_kit_zip')

  const brandingAsset = branding[0]
  const websiteAsset = website[0]
  const socialAsset = social[0]

  const job = await getLatestJobForProject(project.id)
  const sections = sectionsForProject(project)
  const plan = await getOrgPlan(org.id)

  // The assistant only makes sense once there is a brand to refine, and it is
  // a paid feature — so the tab appears only when both are true.
  const canAssist = Boolean(plan?.brandAssistant) && Boolean(brandingAsset)
  const history = canAssist ? await getThreadMessages(project.id) : []

  /*
   * Built in one pass and never mutated afterwards. Pushing a tab in later left
   * `active` derived from a shorter list, so the assistant tab rendered but
   * could never be selected — it always fell back to the first tab.
   */
  const available: ProjectTab[] = [
    ...(brandingAsset ? (['branding'] as const) : []),
    ...(websiteAsset ? (['website'] as const) : []),
    ...(socialAsset ? (['social'] as const) : []),
    ...(canAssist ? (['assistant'] as const) : []),
  ]

  const requested = tab as ProjectTab | undefined
  const active: ProjectTab =
    requested && available.includes(requested) ? requested : (available[0] ?? 'branding')

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold">{project.title}</h1>
            <Badge>{t(`status.${project.status}`)}</Badge>
          </div>
          <p className="mt-1 text-sm text-fg-secondary">
            {t('createdOn', { date: formatDate(project.createdAt, locale) })}
          </p>
        </div>
        <DeleteProjectButton projectId={project.id} />
      </div>

      <GenerationPanel
        projectId={project.id}
        sections={sections}
        initialStatus={project.status}
        initialProgress={job?.progress ?? {}}
        creditBalance={org.creditBalance}
        creditCost={creditsForSections(sections)}
      />

      {available.length > 0 && (
        <ProjectTabs projectId={project.id} active={active} available={available} />
      )}

      {active === 'branding' && brandingAsset && (
        <BrandingView branding={brandingAsset} logos={logoFiles} kit={kitFile} />
      )}
      {active === 'website' && websiteAsset && <WebsiteView website={websiteAsset} />}
      {active === 'social' && socialAsset && <SocialView social={socialAsset} />}
      {active === 'assistant' && canAssist && (
        <AssistantPanel projectId={project.id} initialMessages={history as never} />
      )}

      {available.length === 0 && (
        <Card className="space-y-4">
          <CardTitle>{t('brief')}</CardTitle>
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
              <dd className="mt-0.5 text-sm">{project.targetAudience}</dd>
            </div>
          </dl>
        </Card>
      )}
    </div>
  )
}
