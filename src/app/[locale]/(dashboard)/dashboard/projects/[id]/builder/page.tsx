import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Builder } from '@/components/features/builder/builder'
import { PAGE_KEYS, type Pages, type Theme } from '@/lib/blocks'
import { getOrgPlan } from '@/server/db/queries/plans'
import { getProject, getWebsiteAsset } from '@/server/db/queries/projects'
import { isDomainsConfigured } from '@/server/services/domains'
import { requireOrg } from '@/server/session'

/**
 * Content is normalised here rather than trusted.
 *
 * Rows written before a block type existed, or by an older generation, may be
 * missing pages entirely — the builder should open on those rather than crash.
 */
function normalisePages(raw: unknown): Pages {
  const source = (raw ?? {}) as Record<string, unknown>
  return Object.fromEntries(
    PAGE_KEYS.map((key) => [key, Array.isArray(source[key]) ? source[key] : []]),
  ) as Pages
}

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const { org } = await requireOrg()
  const project = await getProject(org.id, id)
  if (!project) notFound()

  const website = await getWebsiteAsset(project.id)
  if (!website) notFound()

  const plan = await getOrgPlan(org.id)

  return (
    <Builder
      projectId={project.id}
      /* The brand's chosen name if it has one, and the project title until
         then — the same fallback the project page itself uses. */
      projectName={project.businessName || project.title}
      initialPages={normalisePages(website.pages)}
      initialTheme={(website.customStyles ?? {}) as Theme}
      initialSubdomain={website.subdomain}
      initialCustomDomain={website.customDomain}
      isPublished={website.isPublished}
      canPublish={plan?.websiteBuilder ?? false}
      /* Both must hold: the plan sells the feature, and this deployment has
         Vercel credentials to attach a domain with. */
      canUseCustomDomain={(plan?.customDomain ?? false) && isDomainsConfigured()}
    />
  )
}
