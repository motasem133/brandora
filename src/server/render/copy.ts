import 'server-only'

/**
 * What each post in a kit actually says.
 *
 * The first kit put the slogan on all five, which is how a set of posts turns
 * into one poster printed five times. A kit is a sequence: it opens, it
 * introduces, it states something, it shows a detail. Each of those wants its
 * own line.
 *
 * None of this invents copy. Every line already exists somewhere in the
 * project — the branding step writes a story, values, a slogan and names, and
 * the social step writes captions per post. This only decides which line goes
 * where, and falls back through the sources so a project that never ran the
 * social step still gets a kit that reads properly.
 */

export type CopySources = {
  /** Per-post captions from the social step. The richest source when present. */
  posts: { type?: string; caption?: string }[]
  story: string | null
  values: string[]
  slogan: string | null
  voice: string | null
  name: string
}

export type PostCopy = {
  lead: string
  tail: string | null
  /** Set only where a layout reads as prose rather than a headline. */
  body?: string
}

/**
 * Splits prose into sentences without cutting a brand's name in half.
 *
 * The em dash is a separator here as well as the full stop, because the
 * branding model writes with it constantly — "Sultana inherits this legacy—a
 * table where time slows" is two usable lines joined by one, and treating it
 * as punctuation is what gets a headline short enough to set at 88px.
 */
export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?؟۔])\s+|\s*[—–]\s*/)
    .map((s) => s.trim().replace(/^[,،]\s*/, ''))
    .filter((s) => s.length > 12)
}

/**
 * Splits a bilingual line on its divider.
 *
 * Slogans arrive as "العربية | the english", and the two halves are meant to
 * be set as a headline and its subtitle. Passing the raw string through as one
 * line put both scripts on one baseline and let bidi interleave them: "The |
 * مطبخ الست Kitchen of the Matriarch". The divider is a layout instruction, not
 * a character.
 */
export function bilingual(text: string) {
  const [lead, ...rest] = text.split('|').map((part) => part.trim())
  return { lead, tail: rest.join(' ') || null }
}

/** Words no headline should end on. */
const DANGLING =
  /\s+(a|an|the|and|or|of|to|in|on|for|with|at|by|from|as|that|is|are|was|were|if|when|but|so|than|because|while|where|who|which)$/i

/** A full stop, and the scripts' equivalents, followed by a space. */
const SENTENCE_END = /[.!?؟۔](?=\s)/g

/**
 * Trims to something a headline can hold, on a boundary rather than mid-word.
 *
 * Three boundaries, in descending order of how finished the result reads:
 *
 * 1. **A sentence.** A caption's first sentence is almost always the line
 *    somebody would have chosen by hand — "Roasting is mostly listening" —
 *    and it is the only cut that leaves a complete thought. This was missing,
 *    and its absence is what put "Roasting is mostly listening. The beans tell
 *    you when they're done if" on a customer's post: a full stop sat 40
 *    characters inside the window and nothing looked for it.
 * 2. **A clause**, at a comma. "In the alleyways of old Damascus, grandmothers
 *    once rose before dawn to" is what a space produced, and the comma four
 *    words earlier is the actual line. The threshold is low for that reason —
 *    a short whole clause beats a long broken one.
 * 3. **A word**, at a space. The last resort, and the one that reads as
 *    truncation, which is why `clean` reports it and `take` avoids it.
 *
 * The terminal punctuation goes with `tidy`: these are set as headlines beside
 * a mark, where a trailing full stop reads as a typo rather than as grammar.
 */
function fitDetail(text: string, limit: number): { line: string; clean: boolean } {
  const source = text.trim().replace(/\s+$/, '')
  const tidy = (value: string) => value.replace(DANGLING, '').replace(/[.,;:،]$/, '').trim()

  if (source.length <= limit) return { line: tidy(source), clean: true }

  /* One character of slack so a sentence ending exactly at the limit still
     counts — its full stop is the character that would spill. */
  const window = source.slice(0, limit + 1)

  let sentence = -1
  for (const match of window.matchAll(SENTENCE_END)) sentence = match.index
  if (sentence > limit * 0.3) {
    return { line: tidy(window.slice(0, sentence)), clean: true }
  }

  /* An em dash, which `sentences` already treats as a separator: the branding
     and social models both write with it constantly, and the half in front of
     it is a whole thought. "Single-origin means the beans come from one place"
     is the line; cutting at the comma after it gives "…one place — one farm". */
  let dash = -1
  for (const match of window.matchAll(/\s[—–]\s/g)) dash = match.index
  if (dash > limit * 0.3) return { line: tidy(window.slice(0, dash)), clean: true }

  const comma = Math.max(window.lastIndexOf(','), window.lastIndexOf('،'))
  if (comma > limit * 0.35) return { line: tidy(window.slice(0, comma)), clean: true }

  const space = window.lastIndexOf(' ')
  return { line: tidy(space > limit * 0.4 ? window.slice(0, space) : window), clean: false }
}

function fit(text: string, limit: number) {
  return fitDetail(text, limit).line
}

/**
 * Opens a fragment with a capital.
 *
 * Splitting on an em dash leaves the right-hand side starting mid-sentence —
 * "a table where time slows" — which reads as a typo once it is set at 78px on
 * its own. Arabic has no case, so this leaves it alone by construction.
 */
function opening(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * A line per post, never the same line twice.
 *
 * `used` is threaded through so the sequence cannot repeat itself: with three
 * story sentences and five layouts, the naive version put sentence one on two
 * different posts, which reads as a mistake rather than as a refrain.
 */
export function buildCopy(sources: CopySources, layouts: string[]): Record<string, PostCopy> {
  const captions = sources.posts.map((p) => p.caption).filter((c): c is string => Boolean(c?.trim()))
  const story = sources.story ? sentences(sources.story) : []
  const used = new Set<string>()

  /*
   * The best line this pool can give, not the first one it happens to hold.
   *
   * Two passes. The first takes only candidates that end on a sentence or a
   * clause; the second will accept a word-boundary cut. A kit has nine captions
   * to choose from and five layouts to fill, so a caption whose first sentence
   * is longer than the box can simply be passed over in favour of one that
   * fits — which is how "There's a new room in Dubai where the coffee comes
   * first and the noise" stops being the line a customer posts.
   *
   * The fallback pass still exists because a project that ran only the branding
   * step has three story sentences and no captions, and a ragged line beats an
   * empty poster.
   */
  const take = (pool: string[], limit: number) => {
    for (const wantClean of [true, false]) {
      for (const candidate of pool) {
        const { line, clean } = fitDetail(candidate, limit)
        if (wantClean && !clean) continue
        if (line && !used.has(line)) {
          used.add(line)
          return opening(line)
        }
      }
    }
    return null
  }

  const slogan = sources.slogan?.trim() || sources.name
  const out: Record<string, PostCopy> = {}

  for (const layout of layouts) {
    if (layout === 'palette' || layout === 'identity') {
      // These are specimens: the artwork is the content, and a headline over it
      // would be a caption competing with what it captions.
      out[layout] = { lead: sources.name, tail: null }
      continue
    }

    if (layout === 'about') {
      const split = bilingual(slogan)
      out[layout] = {
        lead: fit(split.lead, 60),
        tail: split.tail ? fit(split.tail, 60) : null,
        // Prose, kept whole. This is the one post that is meant to be read.
        body: sources.story?.trim() || sources.values.join(' · '),
      }
      continue
    }

    /*
     * The opening post and the story carry the slogan, because that is the line
     * the brand chose for itself and the one a stranger should meet first.
     * Everything else works down through the captions, then the story, then the
     * values — so the kit stays legible when only the branding step has run.
     */
    if (layout === 'hero' || layout === 'story') {
      const split = bilingual(slogan)
      used.add(fit(split.lead, 70))
      out[layout] = {
        lead: fit(split.lead, 70),
        // The other half of the brand's own line, not the values: it is the
        // translation, and it belongs directly under what it translates.
        tail: split.tail ? fit(split.tail, 70) : sources.values.slice(0, 3).join(' · ') || null,
      }
      continue
    }

    const lead =
      take(captions, 72) ??
      take(story, 72) ??
      take(sources.values.map((v) => v), 72) ??
      fit(slogan, 70)

    out[layout] = { lead, tail: null }
  }

  return out
}
