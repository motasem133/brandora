import type { BrandingOutput } from './schemas'

/**
 * Versioned prompt templates.
 *
 * Versions are persisted onto the generated asset (`prompt_version`) so output
 * quality can be attributed to a specific prompt when it is changed later.
 *
 * Prompts describe *intent*. Structure is enforced by the Zod schema, so none
 * of these describe JSON shapes — that would just be a second, drifting copy of
 * the contract.
 */

export const PROMPT_VERSIONS = {
  branding: 'branding@v1',
  website: 'website@v1',
  social: 'social@v1',
} as const

type Locale = 'en' | 'ar'

/**
 * The subset of a project the prompts actually read.
 *
 * Deliberately not the full `Project` row: these run inside Inngest steps,
 * whose return values are JSON-serialised, so timestamps arrive as strings.
 * Depending only on the fields that matter keeps that irrelevant.
 */
export type ProjectBrief = {
  industry: string
  country: string
  targetAudience: string
  brandStyle: string
  businessName?: string | null
  preferredColors: string[]
  language: Locale
}

function languageRule(locale: Locale) {
  return locale === 'ar'
    ? 'Write entirely in Modern Standard Arabic that reads naturally to Gulf audiences. Do not translate from English — compose natively in Arabic, because naming, idiom and rhythm do not survive translation.'
    : 'Write entirely in English.'
}

/** The shared brief every prompt is grounded in. */
function projectBrief(project: ProjectBrief) {
  return [
    `Industry: ${project.industry}`,
    `Country / market: ${project.country}`,
    `Target audience: ${project.targetAudience}`,
    `Desired brand style: ${project.brandStyle}`,
    project.businessName ? `Preferred business name: ${project.businessName}` : null,
    project.preferredColors.length > 0
      ? `Colours the client likes: ${project.preferredColors.join(', ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n')
}

/* ------------------------------- branding -------------------------------- */

export function brandingSystem(locale: Locale) {
  return `
You are a senior brand strategist with fifteen years at top-tier agencies.
You create brand identities that are commercially viable, culturally grounded and legally distinctive.

${languageRule(locale)}

Hard rules:
- Names must be pronounceable, unlikely to be already trademarked, and free of unintended meanings in the target market.
- The palette must meet WCAG AA contrast between the text and background colours you return.
- Fonts must be real families available on Google Fonts${locale === 'ar' ? ' with full Arabic glyph coverage (for example Cairo, Tajawal, IBM Plex Sans Arabic)' : ''}.
- Never mention that you are an AI, and never explain your process.
`.trim()
}

export function brandingPrompt(project: ProjectBrief) {
  return `
Create a complete brand identity for this business.

${projectBrief(project)}

Give five distinct name directions rather than five variations of one idea.
The palette and fonts should express the "${project.brandStyle}" style without being generic.
`.trim()
}

/* -------------------------------- website -------------------------------- */

export function websiteSystem(locale: Locale) {
  return `
You are a conversion-focused web copywriter.
You write website content that is specific, concrete and free of filler.

${languageRule(locale)}

Hard rules:
- Never write placeholder text such as "Lorem ipsum" or "Your text here".
- Every claim must be plausible for a business of this kind in this market.
- Headlines are short and concrete. Avoid empty superlatives like "world-class" and "cutting-edge".
- Use the brand's established name, voice and values consistently on every page.
`.trim()
}

export function websitePrompt(project: ProjectBrief, branding: BrandingOutput) {
  const name = project.businessName || branding.businessNameIdeas[0].name

  return `
Write the website content for "${name}".

${projectBrief(project)}

Established brand:
- Slogan: ${branding.slogan}
- Voice: ${branding.brandVoice}
- Values: ${branding.brandValues.join(', ')}

Produce four pages: home, about, services and contact.
The home page should open with a hero and build a persuasive sequence from there.
`.trim()
}

/* --------------------------------- social -------------------------------- */

export function socialSystem(locale: Locale) {
  return `
You are a social media strategist who writes scroll-stopping short-form copy.

${languageRule(locale)}

Hard rules:
- Captions must earn attention in the first line.
- Hashtags are lowercase, without the # symbol, and relevant rather than generic spam.
- Vary the nine posts across different intents: introduction, product, social proof, education, behind the scenes, offer.
- Emoji are welcome where they fit the brand style, but never more than a few per caption.
`.trim()
}

export function socialPrompt(project: ProjectBrief, branding: BrandingOutput) {
  const name = project.businessName || branding.businessNameIdeas[0].name

  return `
Create a launch social media kit for "${name}".

${projectBrief(project)}

Established brand:
- Slogan: ${branding.slogan}
- Voice: ${branding.brandVoice}
- Values: ${branding.brandValues.join(', ')}

Write nine Instagram posts that could be scheduled as a coherent launch sequence.
`.trim()
}
