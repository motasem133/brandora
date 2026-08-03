/**
 * Shared truth for the three landing directions.
 *
 * Facts live here so the concepts differ in world and composition only — if a
 * price or a claim differs between them, the comparison is measuring the wrong
 * thing.
 */

export const KIT = [
  { item: 'Business names', detail: 'five, each with the reasoning behind it' },
  { item: 'Logo concepts', detail: 'four, as PNG and traced SVG' },
  { item: 'Colour palette', detail: 'five roles, with hex values' },
  { item: 'Typography', detail: 'heading, body and accent pairing' },
  { item: 'Brand story', detail: 'and the voice to write the rest in' },
  { item: 'Brand values', detail: 'four, derived from the brief' },
  { item: 'Website', detail: 'multi-page, editable, published' },
  { item: 'Social kit', detail: 'nine posts, bios, stories, hashtags, ad copy' },
  { item: 'Favicon and avatars', detail: 'derived from the mark you choose' },
  { item: 'Brand kit', detail: 'every file, zipped' },
] as const

export const PLANS = [
  { name: 'Free', price: 0, credits: '10 credits, once', note: 'One full brand identity' },
  { name: 'Basic', price: 29, credits: '120 credits a month', note: 'Website builder, SVG export' },
  { name: 'Pro', price: 79, credits: '400 credits a month', note: 'Social kit, assistant, priority' },
  { name: 'Business', price: 199, credits: '1,200 credits a month', note: 'Custom domains, unlimited seats' },
] as const

export const STEPS = [
  { n: 'Brief', body: 'Eight questions. Business, industry, market, audience, style, language.' },
  { n: 'Generate', body: 'One queued run. Naming, identity, logos, site and social, in sequence.' },
  { n: 'Choose', body: 'Pick the name and the mark. Everything derived rebuilds around them.' },
  { n: 'Refine', body: 'Say what to change. It regenerates, and every earlier version is kept.' },
  { n: 'Publish', body: 'The site goes live on its own address, or your domain.' },
] as const
