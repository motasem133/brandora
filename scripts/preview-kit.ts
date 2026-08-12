import 'dotenv/config'

import { mkdir, writeFile } from 'node:fs/promises'
import { and, eq, isNull } from 'drizzle-orm'

import { db } from '../src/server/db'
import { brandingAssets, generatedFiles, projects } from '../src/server/db/schema'
import { signedDownloadUrl } from '../src/server/storage/r2'
import { renderSocialPost } from '../src/server/render/social-post'
import { renderKitPdf } from '../src/server/render/kit-pdf'
import { LAYOUTS, type LayoutKind } from '../src/server/render/layouts'
import { fontFace } from '../src/server/render/post-template'
import { liftBackground, splitLockup, trim } from '../src/server/services/logo-parts'

/**
 * Every kit surface, drawn from real work, for nothing.
 *
 * Design on these has been expensive to look at: a post is drawn from
 * photography that cost about seven pence a frame to generate, so iterating on
 * a layout meant either paying for a fresh kit each time or reasoning about CSS
 * with no picture in front of you. Both are why the layouts have been hard to
 * improve.
 *
 * Nothing here generates anything. It reads a project that already has a logo,
 * photography and copy, and re-renders the layouts and the document from those
 * same bytes — the same functions production calls, in the same order, with the
 * same inputs. The only cost is Chromium's time.
 *
 * Usage:
 *   pnpm preview:kit                 — every layout and the PDF, best project
 *   pnpm preview:kit --project=<id>  — a specific one
 *   pnpm preview:kit --layout=hero   — one layout, for a tight loop
 *   pnpm preview:kit --register=loud — force a register, to compare directions
 *
 * Output lands in `.preview/` (git-ignored), one file per layout.
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  }),
)

const OUT = '.preview'

/** The same read the kit does — a signed URL and the bytes behind it. */
async function readObject(key: string) {
  const response = await fetch(await signedDownloadUrl(key))
  if (!response.ok) throw new Error(`Could not read ${key} (${response.status})`)
  return Buffer.from(await response.arrayBuffer())
}

/** The project with the most to draw from, so the layouts are seen full. */
async function bestProject() {
  const rows = await db
    .select({ id: projects.id, title: projects.title })
    .from(projects)
    .innerJoin(brandingAssets, eq(brandingAssets.projectId, projects.id))
    .where(isNull(projects.deletedAt))

  for (const row of rows) {
    const scenes = await db
      .select({ id: generatedFiles.id })
      .from(generatedFiles)
      .where(
        and(eq(generatedFiles.projectId, row.id), eq(generatedFiles.kind, 'social_scene')),
      )
    const [branding] = await db
      .select({ logo: brandingAssets.primaryLogoFileId })
      .from(brandingAssets)
      .where(eq(brandingAssets.projectId, row.id))
      .limit(1)

    if (scenes.length >= 2 && branding?.logo) return { ...row, scenes: scenes.length }
  }

  throw new Error('no project has both a chosen logo and photography to render from')
}

/** Real typefaces, so the document is set in the brand's faces and not Inter. */
async function loadFaces(fonts: { heading: string; body: string }) {
  const families = [...new Set([fonts.heading, fonts.body])]
  const faces = await Promise.all(
    families.map(async (family) => {
      try {
        const css = await fetch(
          `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}`,
          { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1)' } },
        )
        const url = (await css.text()).match(/https:\/\/[^)]+/)?.[0]
        if (!url) return null
        return fontFace(family, Buffer.from(await (await fetch(url)).arrayBuffer()))
      } catch {
        return null
      }
    }),
  )
  return faces.filter(Boolean).join('\n')
}

async function main() {
  await mkdir(OUT, { recursive: true })

  const project = args.project
    ? { id: args.project, title: '(given)', scenes: 0 }
    : await bestProject()

  console.log(`drawing from "${project.title}" — ${project.id}\n`)

  /* The photography already in storage, exactly as the kit passes it. */
  const scenes = await db
    .select({ key: generatedFiles.r2Key, metadata: generatedFiles.metadata })
    .from(generatedFiles)
    .where(
      and(eq(generatedFiles.projectId, project.id), eq(generatedFiles.kind, 'social_scene')),
    )

  const photos: Partial<Record<'hero' | 'people' | 'detail', string>> = {}
  for (const scene of scenes) {
    const kind = scene.metadata?.scene as 'hero' | 'people' | 'detail' | undefined
    if (kind) {
      photos[kind] = `data:image/png;base64,${(await readObject(scene.key)).toString('base64')}`
    }
  }
  console.log(`photography: ${Object.keys(photos).join(', ') || 'none'}`)

  const wanted = (args.layout ? [args.layout] : Object.keys(LAYOUTS)) as LayoutKind[]

  for (const layout of wanted) {
    const needs = LAYOUTS[layout].needs
    if (needs && !photos[needs]) {
      console.log(`  ${layout.padEnd(10)} skipped — no ${needs} photograph`)
      continue
    }

    const started = Date.now()
    const png = await renderSocialPost(project.id, { layout, photos, register: args.register as never })
    const path = `${OUT}/post-${layout}.png`
    await writeFile(path, png)
    console.log(`  ${layout.padEnd(10)} ${path}  ${Date.now() - started}ms`)
  }

  if (args.layout) {
    process.exit(0)
  }

  /* --- the document -------------------------------------------------------- */

  const [row] = await db
    .select({
      title: projects.title,
      businessName: projects.businessName,
      industry: projects.industry,
      style: projects.brandStyle,
      palette: brandingAssets.colorPalette,
      fonts: brandingAssets.fontRecommendations,
      slogan: brandingAssets.slogan,
      story: brandingAssets.brandStory,
      values: brandingAssets.brandValues,
      logoId: brandingAssets.primaryLogoFileId,
    })
    .from(projects)
    .innerJoin(brandingAssets, eq(brandingAssets.projectId, projects.id))
    .where(eq(projects.id, project.id))
    .limit(1)

  const [logoFile] = await db
    .select({ key: generatedFiles.r2Key })
    .from(generatedFiles)
    .where(eq(generatedFiles.id, row.logoId!))
    .limit(1)

  const transparent = await liftBackground(await readObject(logoFile.key))
  const parts = await splitLockup(transparent)
  const trimmed = parts ? null : await trim(transparent)
  const uri = (b: Buffer) => `data:image/png;base64,${b.toString('base64')}`

  const posts = await db
    .select({ key: generatedFiles.r2Key, metadata: generatedFiles.metadata })
    .from(generatedFiles)
    .where(and(eq(generatedFiles.projectId, project.id), eq(generatedFiles.kind, 'social_post')))

  const brand = {
    name: row.businessName || row.title,
    slogan: row.slogan,
    industry: row.industry,
    style: row.style,
    palette: row.palette ?? {
      primary: '#111827', secondary: '#6b7280', background: '#ffffff',
      text: '#111827', accent: '#2563eb',
    },
    fonts: { heading: row.fonts?.heading ?? 'Inter', body: row.fonts?.body ?? 'Inter' },
  }

  const started = Date.now()
  const pdf = await renderKitPdf(
    { brand, story: row.story, values: row.values ?? [], faces: await loadFaces(brand.fonts) },
    {
      logo: uri(transparent),
      wordmark: uri(parts ? parts.text.buffer : trimmed!),
      mark: uri(parts ? parts.icon.buffer : trimmed!),
      scenes: {
        hero: photos.hero,
        detail: photos.detail,
      },
      posts: await Promise.all(
        posts
          .filter((p) => p.metadata?.layout !== 'story')
          .map(async (p) => ({
            label: String(p.metadata?.label ?? 'Post'),
            src: uri(await readObject(p.key)),
          })),
      ),
    },
  )

  await writeFile(`${OUT}/brand-kit.pdf`, pdf)
  console.log(`\n  document   ${OUT}/brand-kit.pdf  ${Date.now() - started}ms`)

  process.exit(0)
}

main()
