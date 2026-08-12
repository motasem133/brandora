import { eq } from 'drizzle-orm'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Builder } from '@/components/features/builder/builder'
import { PAGE_KEYS, type Pages, type Theme } from '@/lib/blocks'
import { registerFor } from '@/lib/register'
import { db } from '@/server/db'
import { getOrgPlan } from '@/server/db/queries/plans'
import { countCustomDomains } from '@/server/db/queries/sites'
import { getProject } from '@/server/db/queries/projects'
import { brandingAssets, websiteAssets } from '@/server/db/schema'
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

  const [website] = await db
    .select()
    .from(websiteAssets)
    .where(eq(websiteAssets.projectId, project.id))
    .limit(1)

  if (!website) notFound()

  const [branding] = await db
    .select({
      palette: brandingAssets.colorPalette,
      fonts: brandingAssets.fontRecommendations,
    })
    .from(brandingAssets)
    .where(eq(brandingAssets.projectId, project.id))
    .limit(1)

  const plan = await getOrgPlan(org.id)

  return (
    <Builder
      projectId={project.id}
      /* The brand's chosen name if it has one, and the project title until
         then — the same fallback the project page itself uses. */
      projectName={project.businessName || project.title}
      initialPages={normalisePages(website.pages)}
      initialTheme={(website.customStyles ?? {}) as Theme}
      /*
       * What the published site is actually set in.
       *
       * The canvas rendered from `customStyles` alone — which is `{}` for every
       * project that has not overridden anything, i.e. all of them — so the
       * builder showed the fallback purple and Syne while production showed the
       * brand's own palette. Passed separately rather than merged into
       * `initialTheme` on purpose: `initialTheme` is what autosave writes back,
       * and folding the palette into it would freeze today's colours into
       * `custom_styles` and leave the site stale the next time the identity is
       * regenerated.
       */
      brandTheme={{
        primaryColor: branding?.palette?.primary,
        secondaryColor: branding?.palette?.secondary,
        backgroundColor: branding?.palette?.background,
        textColor: branding?.palette?.text,
        fontHeading: branding?.fonts?.heading,
        fontBody: branding?.fonts?.body,
      }}
      register={registerFor(project.brandStyle, project.industry)}
      initialSubdomain={website.subdomain}
      initialCustomDomain={website.customDomain}
      isPublished={website.isPublished}
      canPublish={plan?.websiteBuilder ?? false}
      /* Both must hold: the plan sells the feature, and this deployment has
         Vercel credentials to attach a domain with. */
      canUseCustomDomain={(plan?.customDomain ?? false) && isDomainsConfigured()}
      /* Counted excluding this project, so replacing the domain on a site that
         already has one is never mistaken for adding a second. */
      atDomainLimit={
        (plan?.maxCustomDomains ?? 0) >= 0 &&
        (await countCustomDomains(org.id, id)) >= (plan?.maxCustomDomains ?? 0)
      }
    />
  )
}
