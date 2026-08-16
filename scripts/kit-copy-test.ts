import 'dotenv/config'

import { buildCopy, sentences } from '../src/server/render/copy'

/**
 * The line a kit post actually sets, and where it is allowed to stop.
 *
 * A kit post is a headline over a photograph, so the copy has to be cut to fit
 * — and every cut this made was at a comma or a space. A full stop was never
 * looked for, which is how a customer's post came to read "Roasting is mostly
 * listening. The beans tell you when they're done if": a complete sentence sat
 * 40 characters inside the box and the trimmer walked straight past it.
 *
 * The captions below are the real ones from a real run, kept verbatim, because
 * the fault only appears against sentences of the length a model actually
 * writes. Shorter invented ones fit whole and prove nothing.
 */

const CAPTIONS = [
  "There's a new room in Dubai where the coffee comes first and the noise stays outside. We're Weekday Roasters — a small-batch roastery and tasting bar built for people who'd rather understand their cup than just drink it.",
  "This week's batch is a washed Ethiopian from Yirgacheffe. Bright, floral, and clean enough to make you reconsider what coffee is supposed to taste like. We roasted it on Sunday.",
  'Roasting is mostly listening. The beans tell you when they’re done if you pay attention — the sound of first crack, the shift in colour, the smell that fills the room.',
  'Single-origin means the beans come from one place — one farm, one cooperative, one region. Not a blend of whatever was cheapest that month.',
  "This Saturday we're pouring free cuppings from 9 to 11.",
]

const LAYOUTS = ['hero', 'about', 'feature', 'detail', 'statement', 'palette', 'identity']

const sources = {
  posts: CAPTIONS.map((caption) => ({ caption })),
  story:
    'In a city that never slows down, we built a room where time bends to the rhythm of the roast. Every week we select a handful of single-origin lots. We roast them in micro-batches, just enough for the days ahead.',
  values: ['Radical Transparency', 'Slow Craft', 'Curious Palates'],
  slogan: 'Roasted weekly. Sipped slowly.',
  voice: null,
  name: 'Weekday Roasters',
}

let failures = 0
const fail = (message: string) => {
  failures++
  console.error('✗', message)
}

const copy = buildCopy(sources, LAYOUTS)

/*
 * A line may stop early. It may not stop mid-thought — and the tell is the word
 * it ends on, because that is what a reader notices.
 */
const DANGLING_END =
  /\b(a|an|the|and|or|of|to|in|on|for|with|at|by|from|as|that|is|are|was|were|if|when|but|so|than|because|while|where|who|which)$/i

for (const [layout, post] of Object.entries(copy)) {
  for (const [field, value] of [
    ['lead', post.lead],
    ['tail', post.tail],
  ] as const) {
    if (!value) continue
    if (DANGLING_END.test(value.trim())) {
      fail(`${layout}.${field} ends mid-thought: "${value}"`)
    }
    if (/[,،;:]$/.test(value.trim())) {
      fail(`${layout}.${field} ends on punctuation that expects more: "${value}"`)
    }
  }
}

/*
 * The two lines this was built to fix, named. Both have a full stop well inside
 * the box, so both must come back as whole sentences rather than as the longest
 * fragment that fitted.
 */
const leads = Object.values(copy).map((c) => c.lead)

if (!leads.includes('Roasting is mostly listening')) {
  fail(`no post took the sentence "Roasting is mostly listening" — got ${JSON.stringify(leads)}`)
}

if (!leads.some((l) => l.startsWith("This week's batch is a washed Ethiopian from Yirgacheffe"))) {
  fail(`the Yirgacheffe caption did not cut at its full stop — got ${JSON.stringify(leads)}`)
}

/* The caption whose first sentence is longer than any box must be passed over
   rather than clipped, while nine captions are on offer. */
for (const lead of leads) {
  if (lead.includes('the coffee comes first and the noise')) {
    fail(`a caption was clipped mid-sentence when a cleaner one was available: "${lead}"`)
  }
}

/*
 * No two posts drawn from the caption pool may carry the same line — five
 * identical posters is the failure the sequencing exists to prevent, and the
 * two-pass search must not reintroduce it.
 *
 * Only the pool-fed layouts. `hero` and `about` both set the brand's own
 * slogan and `palette` and `identity` both set its name, and both pairs are
 * deliberate: those four are specimens of the identity rather than a sequence
 * of different things to say.
 */
const POOLED = ['feature', 'detail', 'statement']
const seen = new Set<string>()
for (const layout of POOLED) {
  const lead = copy[layout]?.lead
  if (!lead) continue
  if (seen.has(lead)) fail(`${layout} repeats a line already used: "${lead}"`)
  seen.add(lead)
}

/* A brand that only ran the branding step has no captions at all. It still has
   to get a readable kit, which is what the fallback pass is for. */
const brandingOnly = buildCopy({ ...sources, posts: [] }, LAYOUTS)
for (const [layout, post] of Object.entries(brandingOnly)) {
  if (!post.lead?.trim()) fail(`branding-only kit left ${layout} with no line`)
}

if (sentences(sources.story!).length < 2) fail('story did not split into sentences')

console.log(
  failures === 0
    ? '✓ kit copy: cuts at sentences first, skips captions it would have to clip, never repeats a line'
    : `${failures} failure(s)`,
)
process.exit(failures === 0 ? 0 : 1)
