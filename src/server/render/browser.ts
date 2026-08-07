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
/**
 * A browser per render, launched and closed.
 *
 * The instance used to be cached in this module, on the reasoning that Fluid
 * Compute reuses an instance so a launch could be amortised. Measured in
 * production, that reasoning was wrong in a way that looked like a layout bug:
 * requests alternated 200, timeout, 200, timeout. The pattern is the giveaway —
 * the first request on an instance launches a browser and works, the second
 * reuses it and hangs, and the third lands on a fresh instance because the
 * second one is stuck. It is the same failure inside a single invocation, which
 * is why a kit rendered exactly one post and then stopped.
 *
 * The serverless Chromium runs with `--single-process` and `--no-zygote`; a
 * reused browser after a closed context does not reliably survive that. So each
 * render gets its own, and pays about ten seconds for it. Eight posts and a PDF
 * still fit inside the step's ceiling, and a correct kit that takes two minutes
 * beats a fast one that renders a single image.
 */
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)

async function launch(): Promise<Browser> {
  const { chromium } = await import('playwright-core')

  if (!isServerless) {
    // Locally, whatever `playwright install` put on the machine.
    return chromium.launch({ headless: true })
  }

  const serverless = (await import('@sparticuz/chromium')).default
  const { signedDownloadUrl } = await import('@/server/storage/r2')

  /*
   * The browser is fetched at cold start, not shipped in the bundle.
   *
   * `@sparticuz/chromium` keeps a 66MB pack in its own `bin` directory and
   * output tracing does not carry it — the function failed with "The input
   * directory /var/task/node_modules/@sparticuz/chromium/bin does not exist".
   * The obvious fix is an `outputFileTracingIncludes` entry, and that is the
   * mechanism this project already has three failed deployments to: a 31MB
   * include produced outputs Vercel would not deploy at all. 66MB is not the
   * side of that line to test.
   *
   * It unpacks into /tmp, which survives between invocations on the same
   * instance — so the download is paid once per instance even though the
   * browser itself is not reused.
   */
  const pack = await signedDownloadUrl('runtime/chromium-v149-pack.tar', { expiresInSeconds: 900 })

  /*
   * The font pack inside it matters more than it looks. A Lambda-shaped
   * filesystem ships with no fonts at all, so without it every glyph renders
   * as a box — including the Latin ones. Brand faces still arrive per-render
   * as base64 `@font-face` rules, because they differ for every project.
   */
  return chromium.launch({
    args: serverless.args,
    executablePath: await serverless.executablePath(pack),
    headless: true,
  })
}

/** Renders one element to a PNG at an exact size. */
export async function renderToPng(html: string, size: { width: number; height: number }) {
  const browser = await launch()

  try {
    const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: 'networkidle' })
    // Fonts arrive as data URIs, so this resolves without a network wait — but
    // without it the first paint can beat the face being ready and the image
    // ships in a fallback face.
    await page.evaluate(() => document.fonts.ready)

    return await page.locator('body > div').first().screenshot({ type: 'png' })
  } finally {
    await browser.close()
  }
}

/** Runs a job that needs its own browser — printing a PDF, for instance. */
export async function withBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  const browser = await launch()
  try {
    return await fn(browser)
  } finally {
    await browser.close()
  }
}
