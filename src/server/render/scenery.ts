import 'server-only'

import type { ProjectBrief } from '@/server/ai/prompts'

/**
 * The photographs a kit is built on.
 *
 * The reference this product is chasing is carried by its pictures — a painter
 * holding a tin, a shopfront, a product group on a red sweep. Take those away
 * and what is left is a competent typographic post, which is exactly what the
 * first prototype was.
 *
 * These are not stock. Each scene is written from the customer's own brief and
 * palette, so the imagery belongs to that business rather than to its category:
 * a roastery and a bakery both get "food", and only the brief makes one of them
 * look like itself.
 */

export type SceneKind = 'hero' | 'people' | 'detail'

/** What each scene is for, and why a kit needs all three. */
export const SCENES: Record<SceneKind, string> = {
  // The establishing image. Carries the headline on the opening post.
  hero: 'A wide establishing photograph of the subject in its own setting, composed with clear empty space in the upper third for a headline to sit in.',
  // Someone the customer recognises as themselves or their customer.
  people: 'A candid photograph of a person in this business, mid-gesture and looking at what they are doing rather than at the camera.',
  // Texture. What the brand feels like up close.
  detail: 'A tight close-up of a single material, ingredient or surface central to this business, filling the frame.',
}

/**
 * Direction, not decoration.
 *
 * The palette is described rather than commanded — an image model handed hex
 * codes paints hex-coloured objects, which is how you get a teal loaf of bread.
 * Naming the light instead puts the brand's colour in the scene the way a
 * photographer would: in the walls, the props and the hour of day.
 */
function paletteDirection(palette: { primary: string; secondary: string; background: string }) {
  return `Colour grade the scene so it sits beside a palette of ${palette.primary}, ${palette.secondary} and ${palette.background}: let those tones appear in the surroundings, the props and the light rather than in the subject itself.`
}

const condense = (text: string, limit = 260) => {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (clean.length <= limit) return clean
  const cut = clean.slice(0, limit)
  const boundary = cut.lastIndexOf(' ')
  return `${(boundary > 60 ? cut.slice(0, boundary) : cut).replace(/[.,;:]$/, '')}…`
}

export function scenePrompt(params: {
  kind: SceneKind
  project: Pick<ProjectBrief, 'industry' | 'brandBrief' | 'brandStyle'>
  values: string[]
  palette: { primary: string; secondary: string; background: string }
}) {
  const { kind, project, values, palette } = params

  return [
    `Editorial photograph for a ${project.industry} business.`,
    SCENES[kind],
    `The business: ${condense(project.brandBrief)}`,
    values.length ? `It should feel: ${values.slice(0, 4).join(', ')}.` : null,
    paletteDirection(palette),
    'Natural directional light, shallow depth of field, real materials, believable imperfection.',
    /*
     * The negatives are what keep this from looking like a stock library. A
     * model asked for "editorial photograph" will otherwise return a centred,
     * evenly lit, logo-stamped composition — the exact look a brand kit is
     * meant to replace.
     */
    'No text, no lettering, no signage, no logos, no watermark, no borders.',
    'Not a flat lay, not centred and symmetrical, not studio-lit on white, not a stock-photo pose.',
  ]
    .filter(Boolean)
    .join(' ')
}
