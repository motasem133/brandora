# Brandora — Product Truth

<!-- impeccable:product-schema 1 -->

Durable product facts. Visual decisions live in DESIGN.md; this file is what
future design work must not contradict.

## What it is

Brandora generates a complete brand identity from a short brief — what the
business does, who it is for, and what makes it different, in the customer's
own words. From that: business name ideas, two logo concepts, a colour palette,
font pairings, a brand story and voice, a multi-page website, and a social media
kit — in one run, from one brief.

Two concepts, not four. `CREDIT_COSTS.logos` is "six credits for two images" and
`BRAND_COST` is commented "both logo concepts"; the four files a customer
downloads per brand are variants of the chosen concept — wordmark, icon, symbol,
name — not four separate concepts.

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
- Published customer sites are live on a subdomain. A custom domain is a paid
  entitlement: `customDomain` is false on Free and true above it.
- **Three plans: Free, Creator $19 and Studio $49.** Confirmed by the owner on
  17 August 2026, and what `src/server/db/seed.ts` and the live database already
  held. Free is 10 credits a month and one seat; Creator 200 credits, 3 seats
  and one custom domain; Studio 700 credits, 10 seats and unlimited domains. In
  AED, Creator is 69 and Studio 179. Three one-off credit packs sit alongside
  them: 100 for $15, 300 for $39, 1000 for $110.

  **There is no Pro plan and never was, and Agency is gone.** An earlier version
  of this file listed both, at $49 and $99. Pro was never seeded and never sold.
  Agency was real but unbuyable — a row at $99 left inactive when the ladder was
  renamed — and on 17 August 2026 it was deleted from `plans` and archived in
  Polar, because nobody could say what it would include that Studio does not.
  Three plans is the whole ladder; anything quoting a fourth is quoting a record
  that was wrong.
- **Plans are sold in AI credits, not in brands.** A brand count was the
  headline until it stopped describing the product: almost nobody makes twenty
  brands a month, and credits now buy content as well as brands. Surfaces still
  show what a balance is worth in brands, derived rather than restated.
- A run costs credits per section: branding 1, logos 6, website 1, social 1,
  kit 4 — **thirteen credits for a full brand** (`BRAND_COST`). A fresh set of
  logo concepts is therefore the most expensive thing a customer can ask for,
  and the only one they ask for repeatedly. The free plan's brand is a smaller
  object and is counted at a smaller cost.
- **Content Studio is a surface, not just a price table.** Customers come back to
  it to keep producing content against a brand they already generated — which is
  the reason credits, rather than a brand count, are what a plan sells. It prices
  its own operations in `CONTENT_CREDIT_COSTS`, kept apart from the brand run's
  `CREDIT_COSTS` because `GenerationSection` is derived from the latter and
  reaches the Inngest pipeline.
- **An account can have more than one person in it.** Plans carry seat counts,
  teammates are invited by email through an `invitations` table, and
  `/accept-invitation/[id]` is where they land. Collaboration is a real
  capability, not a roadmap item.
- **An abandoned brand gets one email.** `brand-nudge.ts` re-engages the owner
  of a brand that generated *successfully* and was then left alone — not a run
  that failed or stalled. It is due 48 hours after the first completed run
  (`NUDGE_AFTER_HOURS`) and stops being worth sending after 14 days
  (`NUDGE_BEFORE_DAYS`), so a long-cold brand is never woken up. Only verified,
  unsubscribed accounts hear from us, and "came back" is read as having *done*
  something with the brand — another run, content, the assistant, a publish, an
  edit — because nothing here records a page view. It is the product's only
  lifecycle nudge, one message per project ever rather than a sequence, and the
  unique index on `project_emails` is what makes that true.
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

- **Sultana** — a Syrian kitchen, and the run the marketing pages are built out
  of. It is the example that exercises everything the product now does: a name
  with its reasoning ("the feminine of *sultan*"), palette `#1B3A3A / #D4A853 /
  #F43F5E` on `#FEFAF5`, Reem Kufi Ink + El Messiri, four traced logo variants,
  eight designed social posts and a brand-kit PDF. The files committed for
  marketing use are in `public/marketing/` (`sultana-*.webp`,
  `sultana-brand-kit.pdf`) and cost no credits to reuse.

  Two gaps future work must not paper over: **none of its marks carry Arabic** —
  all four are Latin — and **there is no screenshot of a generated website
  anywhere in the repo**. Any surface that needs to show either must demonstrate
  it some other honest way rather than mocking one up.

  The first of those is no longer repo-wide: Dar al-Oud below is a real Arabic
  mark. It remains true of *Sultana*, which is what the marketing pages are
  built out of, so a Sultana surface still may not show an Arabic mark — it
  would have to show Dar al-Oud's.

- **دار العُود والطّياف (Dar al-Oud wa al-Tayyaf)** — a Dubai perfume house, and the
  first run generated **from an Arabic brief**, on 20 August 2026. It exists to
  close the gap named above: Sultana was briefed in English and its marks are
  Latin, so every Arabic claim on the site rested on a brief that could be
  displayed RTL. Naming, story, palette and type are Arabic-native — the heading
  face the run chose is **Aref Ruqaa**, a calligraphic Arabic type.

  **One of its two logo concepts is usable and one is not.** The wordmark is
  correctly shaped, connected Arabic with its diacritics intact, and is committed
  as `public/marketing/dar-al-oud-wordmark.webp` (plus the traced `.svg`). The
  second concept — the geometric icon — renders **malformed Arabic**: broken
  letter joins, a stray fragment, and `ذ` where the name has `د`. It is
  deliberately not committed, and nothing may show it.

  That one-in-two rate is itself the finding. Arabic marks are not reliably
  produced; they are produced often enough that a run yields one, which means any
  surface built on them needs a human to look before it ships.

- **Makān** — an earlier coffee brand, generated end to end. Slogan "Brewed for
  focus."; palette `#6F4E37 / #D4A574 / #C08552` on `#FAF6F0`; Sora + Inter + DM
  Serif Display. The marketing pages no longer use it; it is recorded here
  because it was real output, but verify it still exists in R2 before relying on
  it.

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

## Settled since this record was written

Every decision previously open here has been answered. Kept rather than deleted,
because the reasoning is what stops them being reopened by accident.

- **The plan ladder is Free, Creator $19, Studio $49.** Answered by the owner on
  17 August 2026, settling it in favour of the seed and the live database rather
  than the record — this file was the thing that was wrong. The detail is under
  "What is true and may be claimed"; what belongs here is that Pro and Agency are
  not to be reintroduced from memory.

- **The website and social sections on a project page keep their detail.**
  Answered by the owner: customers do read and copy from them, so the space they
  take is earned. They are not to be compressed to a manifest. Presenting that
  detail better is fair game; removing it is not.

- **The icon is chosen automatically.** Shipped. `isIconStyle` in
  `server/services/logos.ts` picks the icon-like concept out of the round, and
  the favicon, avatars and OG card derive from that rather than from a wordmark
  shrunk to 32px. The customer still makes exactly one choice — which logo —
  which was the point.

- **The first run stays ungated; verification falls after it.** Answered by the
  owner on 24 August 2026, when the alternative was on the table: three of the
  six sign-ups before it took a free brand and never verified, and gating the
  first run would have been a one-line change to `mustVerifyEmail`. It was kept
  as it is. Somebody meets the product before it asks anything of them, and the
  gate arrives when they come back for a second run — which is also when they
  have a reason to answer it.

  What changed instead is that the ask now works: a blocking gate sends a code
  if none is live, because sign-up's code has expired long before anyone is
  asked for it, and an account that drifts away unverified gets exactly one
  reminder. See `services/verify-reminder.ts`. Anything proposing to gate the
  first run again is reopening a decision, not fixing an oversight.

## Open product decisions

Recorded so future work does not mistake current behaviour for a settled answer.

**None.** Both of the last two were answered on 17 August 2026 — the plan ladder,
and the pinned ground hex under "Brand commitments", which turned out not to be a
disagreement at all: `#0B1020` is the light theme's ink, and the dark ground was
deepened to Room Black in the reference pass.

## Brand commitments (client-pinned, recorded not expanded)

Violet `#7240FF` → indigo `#5B5CFB` → blue `#3B82F6` on Dark Navy `#0B1020`;
Plus Jakarta Sans; Lucide icons; Framer Motion; 20–24px radii; premium, modern,
elegant, minimal, AI-first.

Two notes on that pinned line, neither of them a change to it:

- **The pinned navy became the ink, and the ground was deepened.** `#0B1020` was
  not overwritten — it is `--text-primary` in the light theme, and the tint
  behind that theme's borders and insets, so it is load-bearing rather than
  discarded. What changed in the reference pass is the dark ground, which was
  taken down to Room Black `#05070f`; the family is still named Dark Navy in
  `globals.css`, and `.world-dark` exists on `/` and `/pricing` precisely
  because a dark navy ground is a pinned commitment. The direction is kept, the
  literal value moved.

  Settled on 17 August 2026 in favour of Room Black, and not to be reopened by
  someone reading the two hexes side by side. Every accent was measured against
  Room Black, and the pinned navy is lighter and bluer, so restoring it costs
  contrast everywhere: Signal Violet 3.73:1 → 3.51, Reading Grey 9.06 → 8.52,
  Quiet Grey 5.51 → 5.19. Lit Violet is the one that decides it — it was
  *derived* as the tint landing at 7.57:1 dark against 7.53:1 light, and on
  `#0B1020` it falls to 7.13:1, which breaks a matched pair the whole accent
  system is built on. See DESIGN.md's Readable Accent Rule.
- **Plus Jakarta Sans is still the product's family.** A second Latin display
  face, Bricolage Grotesque, was added on the marketing scopes only, by an
  approved decision, and the app is untouched. Recorded here so the pinned
  single-family line is not read as having been broken. The reasoning lives in
  DESIGN.md under the Marketing Pairing Rule.

The mark is a four-point star with a smaller four-point star cut out of its
centre, hard-edged, sweeping blue to violet. It supersedes the traced "B" that
was pinned before, which itself superseded a gradient monogram, and the ramp is
anchored to its violet rather than the other way round — the mark and the
interface are the same colour by construction.

Supplied as `logo.png`, with transparency, and the product uses **that file**.
`scripts/derive-mark.mjs` trims it to the artwork and converts it to WebP;
nothing else is done to it. Rerun that whenever `logo.png` changes.

A vector source would still be better than a 1024px raster for print and for
very large use, but nothing in the product needs it today.

The reference for the visual world is the RedSun template the client supplied
(`Design-reference.mov`): near-black ground, a light source rising behind the
fold, glowing pill controls, hairline cards on a dark ground. Its own accent is
orange; ours is the mark's violet.
