import 'server-only'

import type { Browser } from 'playwright-core'

/**
 * A real browser, because the alternative cannot set Arabic.
 *
 * Satori — what `next/og` runs on — was tried first and measured, on this
 * product's own brands, against its own recommended fonts:
 *
 *   El Messiri    renders, but reverses word order: مطبخ الست came out الست مطبخ
 *   Reem Kufi Ink throws outright: "lookupType: 5 - substFormat: 1 is not
 *                 yet supported", from inside its Arabic ligature pass
 *
 * Silently reordering the words of a customer's slogan is worse than failing,
 * and it would ship on every Arabic post. Chromium shapes both correctly and
 * costs about a second an image, which is the trade being made here.
 *
 * This does mean a binary comes back into the deployment after all of them
 * were removed. It is a different bargain from the last one: nothing here is
 * loaded through a native addon that the bundler has to be warned about, it is
 * an executable this code spawns, and if it fails to launch it fails loudly at
 * the point of use rather than by returning a broken picture.
 */
let browser: Browser | null = null

/** True on Vercel and any other AWS-shaped runtime, where a binary must be supplied. */
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)

export async function getBrowser(): Promise<Browser> {
  // Fluid Compute reuses an instance across requests, so a browser launched on
  // one request is still alive for the next. Launching per render would add a
  // second to every image for nothing.
  if (browser?.isConnected()) return browser

  const { chromium } = await import('playwright-core')

  if (!isServerless) {
    // Locally, whatever `playwright install` put on the machine.
    browser = await chromium.launch({ headless: true })
    return browser
  }

  const serverless = (await import('@sparticuz/chromium')).default
  const { signedDownloadUrl } = await import('@/server/storage/r2')

  /*
   * The browser is fetched at cold start, not shipped in the bundle.
   *
   * `@sparticuz/chromium` keeps a 66MB pack in its own `bin` directory, and
   * output tracing does not carry it — the function failed with "The input
   * directory /var/task/node_modules/@sparticuz/chromium/bin does not exist".
   * The obvious fix is an `outputFileTracingIncludes` entry, and that is the
   * mechanism this project already has three failed deployments to: a 31MB
   * include produced outputs Vercel would not deploy at all. 66MB is not the
   * side of that line to test.
   *
   * So the pack lives in R2, which is already how every other large asset here
   * is served, and a fresh signed URL is minted per cold start. The download
   * happens once per instance and Fluid Compute reuses the instance, so the
   * cost lands on the first render after a deploy rather than on every image.
   */
  const pack = await signedDownloadUrl('runtime/chromium-v149-pack.tar', { expiresInSeconds: 900 })

  /*
   * The font pack inside it matters more than it looks. A Lambda-shaped
   * filesystem ships with no fonts at all, so without it every glyph renders
   * as a box — including the Latin ones. Brand faces still arrive per-render
   * as base64 `@font-face` rules, because they differ for every project.
   */
  browser = await chromium.launch({
    args: serverless.args,
    executablePath: await serverless.executablePath(pack),
    headless: true,
  })

  return browser
}

/** Renders one element to a PNG at an exact size. */
export async function renderToPng(html: string, size: { width: number; height: number }) {
  const instance = await getBrowser()
  const context = await instance.newContext({ viewport: size, deviceScaleFactor: 1 })
  const page = await context.newPage()

  try {
    await page.setContent(html, { waitUntil: 'networkidle' })
    // Fonts arrive as data URIs, so this resolves without a network wait — but
    // without it the first paint can beat the face being ready and the image
    // ships in a fallback face.
    await page.evaluate(() => document.fonts.ready)

    const target = page.locator('body > div').first()
    return await target.screenshot({ type: 'png' })
  } finally {
    await context.close()
  }
}
