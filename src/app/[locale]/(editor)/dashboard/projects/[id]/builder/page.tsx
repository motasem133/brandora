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
import { siteImages } from '@/server/db/queries/site-images'
import { isDomainsConfigured } from '@/server/services/domains'
import { requireOrg } from '@/server/session'

/**
 * Content is normalised here rather than trusted.
 *
 * Rows written before a block type existed, or by an older generation, may be
 * missing pages entirely — the builder should open on those rather than crash.
 * Only the pages a site actually has are kept: which pages exist is per site
 * now, and inventing four empty ones would put a "Menu" tab on a consultancy.
 * `home` is the exception, because a site without one has no front door.
 */
function normalisePages(raw: unknown): Pages {
  const source = (raw ?? {}) as Record<string, unknown>

  const pages = Object.fromEntries(
    PAGE_KEYS.filter((key) => Array.isArray(source[key])).map((key) => [key, source[key]]),
  ) as Pages

  return { home: [], ...pages }
}

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const { org, orgRole } = await requireOrg()
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

  /*
   * The same pictures the published site resolves, by the same function.
   *
   * The canvas showed a photoless site while production was photo-led, which is
   * the third time this preview has drifted from the thing it previews.
   */
  const images = await siteImages(project.id)

  const plan = await getOrgPlan(org.id)

  return (
    <Builder
      projectId={project.id}
      /* The brand's chosen name if it has one, and the project title until
         then — the same fallback the project page itself uses. */
      projectName={project.businessName || project.title}
      initialPages={normalisePages(website.pages)}
      /* What visitors are getting right now, so the editor can say which pages
         have changes waiting. Null until the site has been online once. */
      publishedPages={website.publishedPages ? normalisePages(website.publishedPages) : null}
      publishedTheme={(website.publishedStyles ?? null) as Theme | null}
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
      /* The brand's own language, because its nav is written in it — the same
         rule the published site follows. */
      language={project.language}
      /* The transparent logo, when a kit has been bought. Resolved by kind, as
         the published site resolves it, rather than stored on a block. */
      logoFileId={images.logo ?? null}
      images={images}
      year={new Date().getFullYear()}
      initialSubdomain={website.subdomain}
      initialCustomDomain={website.customDomain}
      isPublished={website.isPublished}
      /*
       * Both halves of the real rule.
       *
       * `publishWebsite` is an `orgAdminAction`, and this only ever asked the
       * plan — so a member on a paying account saw the Publish button, filled
       * in a subdomain, confirmed, and got "Insufficient permissions." at the
       * end of it. The two reasons are different and the panel says which.
       */
      canPublish={(plan?.websiteBuilder ?? false) && orgRole !== 'member'}
      planAllowsPublish={plan?.websiteBuilder ?? false}
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
