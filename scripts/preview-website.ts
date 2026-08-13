import 'dotenv/config'
import { eq } from 'drizzle-orm'

import { db } from '../src/server/db'
import { brandingAssets, projects } from '../src/server/db/schema'
import { runModel } from '../src/server/ai/run'
import { websiteSchema } from '../src/server/ai/schemas'
import { websitePrompt, websiteSystem } from '../src/server/ai/prompts'

/**
 * One website generation, against a real brand, printed rather than stored.
 *
 * Unlike `preview-kit` and `preview-site` this one is not free — it is a real
 * model call and it appears in `ai_usage` like any other. It exists because the
 * alternative is worse: the website contract can only be judged by reading what
 * comes back, and the only other way to get that is a full brand run through
 * Inngest, which costs several calls and writes to the customer's project.
 *
 * Nothing here is stored. It reads a project's brief and its brand, generates
 * the pages, prints the shape and the copy, and exits.
 *
 *   pnpm tsx scripts/preview-website.ts <projectId>
 */
async function main() {
  const id = process.argv[2]
  const [row] = await db
    .select({ project: projects, branding: brandingAssets })
    .from(projects)
    .innerJoin(brandingAssets, eq(brandingAssets.projectId, projects.id))
    .where(eq(projects.id, id))
    .limit(1)

  const { project, branding } = row
  const started = Date.now()

  const output = await runModel({
    task: 'website',
    schema: websiteSchema,
    system: websiteSystem(project.language),
    prompt: websitePrompt(
      {
        industry: project.industry,
        country: project.country,
        brandBrief: project.brandBrief,
        brandStyle: project.brandStyle,
        businessName: project.businessName,
        preferredColors: project.preferredColors ?? [],
        language: project.language,
      } as never,
      branding as never,
    ),
    context: {
      organizationId: project.organizationId,
      projectId: project.id,
      feature: 'website',
    } as never,
  })

  console.log(`${Date.now() - started}ms\n`)
  for (const [page, blocks] of Object.entries(output)) {
    console.log(`# ${page}: ${(blocks as { type: string }[]).map((b) => b.type).join(' → ')}`)
  }
  console.log('\n' + JSON.stringify(output, null, 1).slice(0, 4000))
  process.exit(0)
}

main()
