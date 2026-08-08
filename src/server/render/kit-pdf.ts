import 'server-only'

import type { PostBrand } from './post-template'
import { deviceFor, SHAPE_DEVICES } from './post-template'
import { bilingual } from './copy'
import { withBrowser } from './browser'

/**
 * The whole identity as one file.
 *
 * A folder of PNGs is what a customer receives today, and a folder is not a
 * deliverable — it is raw material. The reference this product is chasing is a
 * single document that can be sent to a printer, a franchisee or an investor
 * and understood without explanation, which is a different artefact from the
 * assets it contains.
 *
 * Printed by the same browser that renders the posts, for one reason worth
 * more than convenience: text stays text. A deck assembled from screenshots is
 * a stack of pictures of words — unsearchable, unselectable, and soft the
 * moment anyone zooms. Chromium's own print pipeline emits real vector type
 * for everything except the photographs.
 */

export type KitPage = { key: string; title: string }

/** 16:9, because this is presented before it is printed. */
const PAGE = { width: 1600, height: 900 }

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const hasArabic = (value: string) => /[؀-ۿ]/.test(value)

export type KitAssets = {
  /** The full lockup, transparent. */
  logo: string
  /** The name alone. */
  wordmark: string
  /** The symbol alone. */
  mark: string
  /** Finished posts, in the order they should be shown. */
  posts: { label: string; src: string }[]
  /** Scene photography, used as full-bleed grounds. */
  scenes: { hero?: string; detail?: string }
}

export type KitContent = {
  brand: PostBrand
  story: string | null
  values: string[]
  faces: string
}

function cover(c: KitContent, a: KitAssets) {
  const p = c.brand.palette
  const { lead, tail } = bilingual(c.brand.slogan?.trim() || c.brand.name)
  const device = SHAPE_DEVICES[deviceFor(c.brand.style, c.brand.industry)]

  /*
   * The slogan sits on the plate, not on the photograph.
   *
   * Same rule as every post in the kit, and for the same reason: a COLR
   * heading face paints its own colour, so the Arabic came out red on a dark
   * ground and could not be read. The plate is where the words go.
   */
  return `<section class="page" style="background:${p.primary}">
    ${a.scenes.hero ? `<img class="bleed" src="${a.scenes.hero}" style="opacity:.42"/>` : ''}
    <div class="veil" style="background:linear-gradient(to bottom, rgba(0,0,0,.42), rgba(0,0,0,.10) 45%, ${p.primary})"></div>
    <img class="cover-mark" src="${a.wordmark}"/>
    <div class="cover-foot" style="color:${p.background}">Brand kit</div>
    <div class="cover-plate">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${device}" fill="${p.background}"/></svg>
      <div class="cover-words">
        <div class="cover-line" style="color:${p.text};font-family:'${c.brand.fonts.heading}'"
          ${hasArabic(lead) ? 'dir="rtl"' : ''}>${escape(lead)}</div>
        ${tail ? `<div class="cover-sub" style="color:${p.primary}">${escape(tail)}</div>` : ''}
      </div>
    </div>
  </section>`
}

function palette(c: KitContent) {
  const p = c.brand.palette
  const swatches = [
    ['Primary', p.primary, 'Grounds, headlines, the colour the brand is'],
    ['Secondary', p.secondary, 'Rules, accents, the second voice'],
    ['Accent', p.accent, 'One thing at a time — a button, a badge'],
    ['Background', p.background, 'Plates, paper, where the words sit'],
  ] as const

  return `<section class="page pale" style="background:${p.background}">
    <h2 style="color:${p.text}">Colour</h2>
    <div class="swatches">
      ${swatches.map(([label, hex, use]) => `
        <div class="swatch">
          <div class="chip" style="background:${hex}"></div>
          <b style="color:${p.text}">${label}</b>
          <code style="color:${p.text}">${hex.toUpperCase()}</code>
          <span style="color:${p.primary}">${use}</span>
        </div>`).join('')}
    </div>
    <div class="rule" style="background:${p.primary}"></div>
    <h2 style="color:${p.text};margin-top:0">Type</h2>
    <div class="faces">
      <div>
        <span style="color:${p.primary}">Heading &middot; ${escape(c.brand.fonts.heading)}</span>
        <div style="font-family:'${c.brand.fonts.heading}';color:${p.text};font-size:64px">${escape(c.brand.name)}</div>
      </div>
      <div>
        <span style="color:${p.primary}">Body &middot; ${escape(c.brand.fonts.body)}</span>
        <div style="font-family:'${c.brand.fonts.body}';color:${p.text};font-size:38px;line-height:1.4">
          ${escape(c.values.slice(0, 4).join(' · '))}</div>
      </div>
    </div>
  </section>`
}

function marks(c: KitContent, a: KitAssets) {
  const p = c.brand.palette
  return `<section class="page pale" style="background:${p.background}">
    <h2 style="color:${p.text}">The mark</h2>
    <div class="marks">
      <figure><div class="hold" style="background:${p.background};border:1px solid rgba(0,0,0,.10)">
        <img src="${a.wordmark}"/></div><figcaption style="color:${p.primary}">Full lockup</figcaption></figure>
      <figure><div class="hold" style="background:${p.primary}">
        <img src="${a.wordmark}" style="filter:brightness(0) invert(1)"/></div>
        <figcaption style="color:${p.primary}">Reversed</figcaption></figure>
      <figure><div class="hold" style="background:${p.background};border:1px solid rgba(0,0,0,.10)">
        <img src="${a.mark}"/></div><figcaption style="color:${p.primary}">Symbol alone</figcaption></figure>
      <figure><div class="hold" style="background:${p.secondary}">
        <img src="${a.wordmark}"/></div><figcaption style="color:${p.primary}">On secondary</figcaption></figure>
    </div>
    <p class="note" style="color:${p.primary}">Every file here is transparent. Keep clear space around the mark
      equal to the height of its symbol, and never set it on a ground that leaves less than a clear step of
      contrast.</p>
  </section>`
}

function story(c: KitContent, a: KitAssets) {
  const p = c.brand.palette

  /*
   * Paragraphs, not headline fragments.
   *
   * `sentences()` also splits on the em dash, which is right for pulling a
   * short line out for a post and wrong here — it broke one thought into
   * "Sultana inherits this legacy" and "a table where time slows" as two
   * paragraphs, and the extra breaks pushed the last line off the bottom of
   * the page. Prose keeps its own punctuation.
   */
  const paragraphs = (c.story ?? '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?؟۔])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)

  return `<section class="page story-page" style="background:${p.primary}">
    ${a.scenes.detail ? `<img class="bleed" src="${a.scenes.detail}" style="opacity:.22"/>` : ''}
    <div class="story-inner">
      <h2 style="color:${p.background}">Our story</h2>
      <div class="story-body" style="color:${p.background};font-family:'${c.brand.fonts.body}'">
        ${paragraphs.map((line) => `<p>${escape(line)}</p>`).join('')}
      </div>
      <div class="values">${c.values.map((v) => `<span style="border-color:${p.secondary};color:${p.background}">${escape(v)}</span>`).join('')}</div>
    </div>
  </section>`
}

/**
 * Split into pages of at most three, as evenly as the count allows.
 *
 * Chunking by threes left seven posts as 3/3/1, and a page whose whole job was
 * one orphan. Seven is what a kit produces once the vertical story is dropped,
 * so that was the common case rather than an edge one.
 */
function inPagesOfThree<T>(items: T[]) {
  const pages = Math.ceil(items.length / 3)
  const groups: T[][] = []
  let start = 0

  for (let page = 0; page < pages; page += 1) {
    const size = Math.ceil((items.length - start) / (pages - page))
    groups.push(items.slice(start, start + size))
    start += size
  }

  return groups
}

function socialPages(c: KitContent, a: KitAssets) {
  const p = c.brand.palette
  const groups = inPagesOfThree(a.posts)

  return groups.map((group, index) => `<section class="page pale" style="background:${p.background}">
    <h2 style="color:${p.text}">Social${groups.length > 1 ? ` <em style="opacity:.4">${index + 1}/${groups.length}</em>` : ''}</h2>
    <div class="grid">
      ${group.map((post) => `<figure><img src="${post.src}"/>
        <figcaption style="color:${p.primary}">${escape(post.label)}</figcaption></figure>`).join('')}
    </div>
  </section>`).join('')
}

export function kitDocument(c: KitContent, a: KitAssets) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${PAGE.width}px ${PAGE.height}px; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    ${c.faces}
    body { font-family:'${c.brand.fonts.body}'; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

    .page { width:${PAGE.width}px; height:${PAGE.height}px; position:relative; overflow:hidden;
            break-after:page; page-break-after:always; }
    .page:last-child { break-after:auto; page-break-after:auto; }
    .pale { padding:86px 96px; display:flex; flex-direction:column; }

    .bleed { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
    .veil  { position:absolute; inset:0; }
    .cut   { position:absolute; left:0; bottom:0; width:100%; height:210px; }

    h2 { font-size:26px; font-weight:400; letter-spacing:.24em; text-transform:uppercase;
         margin-bottom:44px; }

    .cover-mark  { position:absolute; left:96px; top:86px; height:74px; object-fit:contain;
                   filter:brightness(0) invert(1); }
    .cover-plate { position:absolute; left:0; bottom:0; width:100%; height:430px; }
    .cover-plate svg { position:absolute; inset:0; width:100%; height:100%; }
    .cover-words { position:absolute; inset:0; display:flex; flex-direction:column;
                   align-items:center; justify-content:center; padding:0 120px; }
    .cover-line  { font-size:80px; line-height:1.16; text-align:center; }
    .cover-sub   { font-size:28px; margin-top:18px; opacity:.75; text-align:center; }
    .cover-foot  { position:absolute; right:96px; top:96px; font-size:18px; letter-spacing:.3em;
                   text-transform:uppercase; opacity:.7; }

    .swatches { display:flex; gap:34px; }
    .swatch { flex:1; display:flex; flex-direction:column; }
    .chip { height:190px; border-radius:16px; border:1px solid rgba(0,0,0,.10); }
    .swatch b { font-size:20px; font-weight:600; margin-top:20px; }
    .swatch code { font-family:ui-monospace,Menlo,monospace; font-size:17px; opacity:.65; margin-top:4px; }
    .swatch span { font-size:15px; line-height:1.5; opacity:.6; margin-top:10px; }

    .rule { height:1px; opacity:.16; margin:56px 0 46px; }
    .faces { display:flex; gap:64px; }
    .faces > div { flex:1; }
    .faces span { font-size:15px; letter-spacing:.2em; text-transform:uppercase; opacity:.55;
                  display:block; margin-bottom:16px; }

    .marks { display:flex; gap:30px; flex:1; }
    .marks figure { flex:1; display:flex; flex-direction:column; }
    .hold { flex:1; border-radius:16px; display:flex; align-items:center; justify-content:center; padding:44px; }
    .hold img { max-width:100%; max-height:190px; object-fit:contain; }
    .marks figcaption { font-size:16px; margin-top:16px; opacity:.7; }
    .note { font-size:16px; line-height:1.6; max-width:74ch; margin-top:34px; opacity:.7; }

    /* Laid out rather than centred by transform: the old version could not
       know it had overflowed, and the last line ran off the page. */
    .story-page { display:flex; }
    .story-inner { position:relative; z-index:1; margin:auto; padding:80px 96px; width:100%; }
    .story-body p { font-size:27px; line-height:1.58; max-width:52ch; margin-bottom:20px; opacity:.92; }
    .values { display:flex; gap:14px; margin-top:34px; flex-wrap:wrap; }
    .values span { font-size:16px; letter-spacing:.16em; text-transform:uppercase; padding:10px 20px;
                   border:1px solid; border-radius:999px; opacity:.85; }

    /* A column is always a third of the row, never a share of it. With
       'flex:1' a page holding fewer than three posts stretched them to fill,
       so the last page blew one 560px thumbnail up to full width — embedded
       for a 430px column and printing at 38dpi, visibly pixelated. Short rows
       centre instead. */
    .grid { display:flex; gap:34px; flex:1; align-items:center; justify-content:center; }
    .grid figure { flex:0 0 calc((100% - 68px) / 3); display:flex; flex-direction:column; }
    .grid img { width:100%; border-radius:14px; display:block; }
    .grid figcaption { font-size:16px; margin-top:16px; opacity:.7; }
  </style></head><body>
    ${cover(c, a)}
    ${palette(c)}
    ${marks(c, a)}
    ${story(c, a)}
    ${socialPages(c, a)}
  </body></html>`
}

/** Prints the whole kit to a single PDF. */
export async function renderKitPdf(content: KitContent, assets: KitAssets) {
  return withBrowser(async (browser) => {
    const page = await browser.newPage({ viewport: PAGE })

    await page.setContent(kitDocument(content, assets), { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)

    return page.pdf({
      width: `${PAGE.width}px`,
      height: `${PAGE.height}px`,
      printBackground: true,
      // Chromium adds a margin by default, which would letterbox every page
      // inside its own bleed.
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
  })
}
