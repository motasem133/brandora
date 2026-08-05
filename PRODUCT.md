# Brandora — Product Truth

<!-- impeccable:product-schema 1 -->

Durable product facts. Visual decisions live in DESIGN.md; this file is what
future design work must not contradict.

## What it is

Brandora generates a complete brand identity from a short brief — what the
business does, who it is for, and what makes it different, in the customer's
own words. From that: business name
ideas, four logo concepts, a colour palette, font pairings, a brand story and
voice, a multi-page website, and a social media kit — in one run, from one
brief.

## Platform

web

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
- Pricing is real and seeded: Free, Basic $29, Pro $79, Business $199 — monthly,
  and only monthly.
- A run costs credits per section: branding 1, logos 6, website 1, social 1. A
  fresh set of logo concepts is therefore the most expensive thing a customer
  can ask for, and the only one they ask for repeatedly.
- Generation is gated on a verified email address. Free credits are the obvious
  abuse target, so verification gates spending rather than sign-in.

## Billing and access policy

Settled decisions about money. Future work must not quietly reverse them.

- **Billing is monthly. There is no annual plan.** Annual prices existed in the
  plans table with no product behind them in Polar, so the yearly view priced
  something nobody could buy. The period switch and the annual figures come out
  of the product rather than advertising a period that does not exist.
- **Access ends at the first failed charge.** A subscription whose payment fails
  stops entitling its plan immediately; it is not carried through the retry
  window. The account, the brands and any credits already granted are untouched,
  and the plan returns the moment a payment succeeds.
- **Credits already granted are never taken back.** They were paid for. A
  downgrade, a cancellation and the end of access all leave them in the account.
  The single exception is a refund, which reverses in proportion to the amount
  actually refunded.
- **An upgrade pays out when it is charged.** Moving to a larger plan mid-period
  grants the credit difference at once, because Polar charges the prorated
  difference at once. A downgrade grants nothing and removes nothing, and moving
  between plans repeatedly cannot repeat a grant.
- **What the product shows as charged is what the card was charged**, tax
  included. Polar is Merchant of Record and collects the tax, so the receipt in
  the payment history is the total, not the net that reaches the business.

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

## Known limitations

- **Renaming a brand renames the record, not the work.** Choosing a different
  name updates the project and the brand; the logo, the website copy and the
  social captions keep the old one until they are generated again. Regenerating
  is a separate, paid act, so the product states the limit rather than implying
  the kit follows.

## Operating context

**Customers come back to make more brands.** The account that matters is the
freelancer or small agency producing identities for a series of clients, not the
founder who runs once and leaves. A brand is finished in a session or two — a
brief, a two-minute run, a few rounds of logo refinement — and then the next one
starts.

That has consequences future work must respect: the account accumulates brands
rather than settling on one, so surfaces that list them are the product's spine
and must stay legible at ten as well as at one; comparing across brands is a
real job, not an edge case; and a customer arriving for their third run should
not be re-taught the first.

## Durable constraints

- **Bilingual, both directions.** Every surface must work in Arabic with RTL;
  Arabic is a first-class language here, not a translation layer.
- **Accessibility:** keyboard reachable, visible focus, and motion that collapses
  under `prefers-reduced-motion`.
- **Credits are real money.** Anything that triggers generation spends a
  customer's credits and a real API call. Anything that can spend them shows
  both the price and the balance, at the control that spends them — an amount
  a customer has to remember from another page is not a price they were told.

## Product principles

1. **The kit must agree with itself.** Coherence across the deliverables
   outranks the quality of any one of them. A better logo that no longer matches
   the palette, the story and the site makes the product worse, not better. This
   is the claim a neighbouring product cannot truthfully copy, and the reason
   everything generates from a single brief.
2. **Credits are real money.** Nothing spends them without a deliberate act, and
   anything that can spend them says so before it does.
3. **Arabic is generated, not translated.** For an Arabic brief the model
   composes natively from the start. Every surface works in both directions.
4. **The output stays editable.** What a run produces is a starting point, not a
   deliverable PDF. The logo rounds, the brand assistant and the website builder
   exist so the customer can move it afterwards.

## Open product decisions

Recorded so future work does not mistake current behaviour for a settled answer.

- **What the website and social sections on a project page are for.** They
  render every page block and all nine posts read-only, duplicating what the
  builder opens, and account for well over half the page. Whether customers
  actually read and copy from there — making the detail worth its space — or
  only need proof the run delivered, is not established. It decides whether
  those sections shrink to a manifest or keep their detail and are presented
  better, so it is worth an answer from real use rather than a guess.

- **How the icon is chosen.** Choosing a logo is currently the only decision, and
  the favicon, avatars and OG card all derive from it. That is deliberate — the
  two-choice model was unusable — but it is not the end state: a wordmark shrunk
  to 32px is an unreadable smudge, and the intended answer is to select the most
  icon-like concept automatically rather than to hand the choice back.

## Brand commitments (client-pinned, recorded not expanded)

Violet `#7240FF` → indigo `#5B5CFB` → blue `#3B82F6` on Dark Navy `#0B1020`;
Plus Jakarta Sans; Lucide icons; Framer Motion; 20–24px radii; premium, modern,
elegant, minimal, AI-first.

The mark is a flat violet "B" with a four-point sparkle cut out of it and three
motion lines entering from the left. It supersedes the gradient monogram with
two sparkles that was pinned before, and the ramp is anchored to its violet
rather than the other way round — the mark and the interface are the same colour
by construction. Supplied as a neon PNG render; the app draws it as SVG traced
from that artwork with the product's own vectoriser, and a vector source would
still be better than a trace.

The reference for the visual world is the RedSun template the client supplied
(`Design-reference.mov`): near-black ground, a light source rising behind the
fold, glowing pill controls, hairline cards on a dark ground. Its own accent is
orange; ours is the mark's violet.
