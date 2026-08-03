# Brandora — Product Truth

Durable product facts. Visual decisions live in DESIGN.md; this file is what
future design work must not contradict.

## What it is

Brandora generates a complete brand identity from a short brief: business name
ideas, four logo concepts, a colour palette, font pairings, a brand story and
voice, a multi-page website, and a social media kit — in one run, from one
brief.

## Platform

`web`.

## Stack

Already scaffolded and in production use, not a decision to reopen: Next.js 16
(App Router, RSC), TypeScript, Tailwind v4, Drizzle + Postgres, Better Auth,
Inngest for job orchestration, Polar for billing, Cloudflare R2 for assets,
next-intl for English and Arabic.

## Primary user

**Anyone, anywhere, who needs a brand and does not have a designer.** The
product is open to the world — the visitor is not qualified by region, company
size or role before they try it. In practice that spans a founder before launch,
a small business rebranding, and a freelancer producing an identity for a
client, and the page must not assume which one is reading.

The job: *"I need a brand — not just a logo — and I need it now."*

## The meaningfully different mechanism

**The whole kit, one run.** Competitors stop at a logo. One brief here produces
names, logos, palette, typography, brand story and voice, a real website, and a
social kit — coherent with each other because they were generated from the same
brand decision, not assembled separately.

Supporting truths, real but not the headline:

- **Arabic is generated natively, not translated.** For an Arabic brief the model
  works in Arabic from the start; naming, idiom and rhythm do not survive
  translation. The whole product is bilingual with full RTL.
- **The output stays editable.** A website builder and a per-project brand
  assistant refine what was generated; it is not a static PDF.
- **Generation is a queued job with live progress**, not a blocking request.

## What is true and may be claimed

- The full kit list above, because the pipeline produces every item.
- Logos arrive as raster and traced SVG, plus favicon, avatars, an OG card, a
  monochrome mark and a brand-kit ZIP.
- Published customer sites are live on a subdomain, and Business plans can
  attach their own domain.
- Pricing is real and seeded: Free, Basic $29, Pro $79, Business $199 monthly,
  each with an annual price at ten months.

## What may NOT be claimed

No customers, no testimonials, no usage numbers, no press, no funding, no
awards, no "trusted by" row. **None exist.** Any example brand shown must be
labelled as generated output.

## Evidence available for marketing

Genuine product output already generated and stored, usable without spending new
credits:

- **Makān** — a coffee brand generated end to end. Slogan "Brewed for focus.";
  palette `#6F4E37 / #D4A574 / #C08552` on `#FAF6F0`; Sora + Inter + DM Serif
  Display; values "Intentional Restraint, Sensory Clarity, Modern Heritage,
  Quiet Confidence"; alternative names including *Qahwa Sākin* with its
  rationale. Four logo concepts as PNG and SVG, favicon, avatars and a brand kit
  in R2. Its website is published and reachable.

## Durable constraints

- **Bilingual, both directions.** Every surface must work in Arabic with RTL;
  Arabic is a first-class language here, not a translation layer.
- **Accessibility:** keyboard reachable, visible focus, and motion that collapses
  under `prefers-reduced-motion`.
- **Credits are real money.** Anything that triggers generation spends a
  customer's credits and a real API call.

## Brand commitments (client-pinned, recorded not expanded)

Purple `#7C3AED` → indigo `#4F46E5` → blue `#3B82F6` on Dark Navy `#0B1020`;
Plus Jakarta Sans; Lucide icons; Framer Motion; 20–24px radii; premium, modern,
elegant, minimal, AI-first. The logo is a gradient "B" monogram with two
four-point sparkles.
