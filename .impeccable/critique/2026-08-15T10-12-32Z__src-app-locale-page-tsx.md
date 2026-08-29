---
target: landing
total_score: 23
max_score: 36
na_heuristics: 9
p0_count: 2
p1_count: 3
timestamp: 2026-08-15T10-12-32Z
slug: src-app-locale-page-tsx
---
Method: dual-agent (A: a27993a1cf209949a · B: a92a2f8d16b052202). Not degraded. First critique of the landing page at its own slug; the two 2026-08-04 snapshots under `src-app-locale` were whole-system passes (22 routes) and are not comparable.

Reviewed after the "The Run" rebuild (branch `landing-the-run`, commit a91ed91).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Clock, per-step bars, live region and scroll progress are all real — but on mobile the whole replay finishes 600px below the fold, unseen |
| 2 | Match System / Real World | 2 | Pipeline vocabulary throughout: "One run", "run · Sultana", "How a run works", "Run progress", and the literal step keys branding/logos/website/social/kit. Four uses above the fold, never defined |
| 3 | User Control and Freedom | 2 | No pause or scrub on the 9s replay. No locale switcher exists outside settings — a visitor sold by "Arabic that was written in Arabic" on /en cannot reach /ar |
| 4 | Consistency and Standards | 2 | "Two logo concepts" labels four visible marks; every Arabic heading falls to a system face; `run · Sultana` is a hardcoded English literal on /ar |
| 5 | Error Prevention | 2 | Free's feature list is the longest (7 items vs Creator 6, Studio 4) — persuasion inverted at the decision point |
| 6 | Recognition Rather Than Recall | 3 | Contact sheet is exemplary. Undercut by three tiles that ask you to imagine: the website skeleton, the typography tile naming two faces it sets neither in, and 10 text pills |
| 7 | Flexibility and Efficiency | 3 | Skip link, sticky CTA, anchor nav, spine, replay control. But the spine is `lg:` only, so phone and tablet get no navigation across 11,174px |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained and well-tokenised; costed by dead space — 300px of empty column beside steps 4–5, a 2-of-6-column hole in the contact sheet |
| 9 | Error Recovery | n/a | No user action on this surface can fail; every control is navigation or a local toggle. Errors belong to /register |
| 10 | Help and Documentation | 3 | Nine FAQ answers on-page including the two that block purchase. Presented as nine simultaneously-closed rows with no grouping |
| **Total** | | **23/36** | **64% — Acceptable** |

## Design Specificity Verdict

**Two brilliant ideas wearing a stock AI-SaaS suit.** Specific in about 30% of its area, category-interchangeable in the rest.

Unmistakably this product: the `.world-light` handover, the accent flip in the run panel, the contact sheet on real paper. The handover is not a colour change — it is the argument.

Category-interchangeable: the hero shape (gradient badge-pill + oversized headline with muted trailing clause + deck + two pills + right panel) is the 2024 Linear/Resend hero unmodified. Violet-on-near-black with arc glows reads "developer tool", not "brand identity". Numbered rail + sticky screenshot is stock. The RunSpine is four grey dashes — the page's organizing metaphor is "the run" and its persistent nav is the most generic scroll indicator that exists. The signature does not propagate; after ~2,900px the page becomes a competent template.

**Deterministic scan:** both CLI scans returned `[]`, exit 0. Assessment B verified this was not a no-op (control file produced 3 findings; config suppressions checked; re-ran with `--no-config`). The clean result is genuine but narrow — for .tsx the CLI runs the regex engine only. The browser engine found 13 anti-pattern elements (15 findings /en, 14 /ar): oversized-h1 (74px, 46vh), line-length (~125 chars), gpt-thin-border-wide-shadow ×5 (one `.rail-node` repeated by a map), nested-cards ×2, dark-glow, radial-spotlight-glow, kicker-above-heading ×2, tiny-text (11px).

`nested-cards` ×2 is a self-inflicted rule break — DESIGN.md's own Don't list forbids nesting a card inside a card.

**Visual overlays:** injection succeeded on both locales and the detector ran in-page, but the live server was correctly stopped before reporting. No overlay tab remains open.

## Corrections made during synthesis

- B reported "the primary hero CTA is 36px". Measured: hero CTAs are 52px (`size="lg"`); the 36px control is the sticky header CTA (`size="sm"`). Still under 44px, but a smaller finding than reported.
- B flagged PRODUCT.md changing mid-run as a concurrent session. It was this session's own `/impeccable init`.
- B's `tiny-text` fired on /ar only; B verified 11px `type-eyebrow` is present in both locales. Treat as both-locale.
- B's "57 elements at opacity 0" is not a defect: 47 recover on scroll, 5 are the correctly-hidden spine, 5 are crossfade layers. Reduced-motion and JS-off settle at 14 immediately.

## What's Working

1. **The guest-palette handover — the mechanism, not the colour.** Re-pointing `--bg-base`, `--text-primary`, `--border`, `--accent-surface` at `--guest-*` means every existing utility resolves to the guest brand's ink without any component knowing. Withholding `--brand-primary` so a guest palette cannot shadow the focus ring proves it was thought through rather than styled.
2. **Honesty discipline, with no cracks.** No logo wall, no invented numbers. The website tile refuses to fake a screenshot and says so. The published address is deliberately not a link because subdomains do not resolve. The replay is labelled a replay with the real duration beside a scaled clock.
3. **Pricing shows its arithmetic.** Credits lead, worth sits underneath, both derived from the table that bills. Studio's seat ceiling gets a real mailto rather than a fabricated contact page.

## Priority Issues

### [P0] The signature element never plays on mobile
Run panel top edge y=626 on a 390px viewport, 616px tall. `useReplay` starts on mount, not on intersection, so all nine seconds elapse off-screen. The user scrolls to a static end state and never sees the flip, the bars, or the arrival.
Why it matters: the page's only demonstration of the product, and on phones it never happens.
Fix: gate `start()` behind an IntersectionObserver on the `<figure>` (threshold ~0.4, once). Independently reclaim ~230px above the crease by shortening the mobile deck or reordering the panel above the buttons.
Suggested command: /impeccable adapt

### [P0] Every Arabic heading renders in a system fallback face
Verified by computed style on /ar: h1 and all seven h2s resolve to "Bricolage Grotesque", … ui-sans-serif. Bricolage has no Arabic coverage. `type-display` and `type-section` set `font-family: var(--font-display)` and their `[dir='rtl']` blocks adjust only line-height and letter-spacing, never the family. `type-eyebrow` gets this right; the two that matter most do not.
Why it matters: the Arabic hero has none of the English hero's authority, on the page that exists to prove native Arabic. Regression introduced when the display face was added without an RTL override.
Fix: add `font-family: var(--font-arabic);` inside the existing `[dir='rtl'] &` blocks of both utilities, and to `.font-display`.
Suggested command: /impeccable typeset

### [P1] RTL bidi corrupts every machine string
All `.font-mono` spans compute `direction: rtl` on /ar. Hex codes render as `1B3A3A#`; the website tile's page chips render as `home/`, `about/`, `menu/`, `contact/`. The clock and SITE_ADDRESS are exposed the same way.
Why it matters: a hex is a copy-paste value and a path is a route; both are wrong on screen. This is the exact failure the page's own header comment claims to have fixed.
Fix: `dir="ltr"` or `unicode-bidi: isolate` on a shared machine-value utility. Move `run · Sultana` into the catalogue.
Suggested command: /impeccable harden

### [P1] "Two logo concepts" labels four visible marks
Both the hero payload and the contact sheet render all four of LOGOS under a heading saying two, in both locales.
Why it matters: the first countable claim on the light section, wrong by inspection, at the moment the page asks to be believed. PRODUCT.md records the truth: two concepts, four lockups.
Fix: say "Two concepts · four lockups" and group the tiles 2+2 so the pairing is visible.
Suggested command: /impeccable clarify

### [P1] The "How it works" sticky panel is wrong for four of five steps
One static image captioned "The first of eight questions" sits beside all five steps. The ol is 702px, the sticky block 403px — ~300px of dead column beside steps 4–5 while the caption contradicts the step being read.
Fix: swap the artifact per active step using the IntersectionObserver pattern RunSpine already implements; or drop the sticky and give each li a small inline artifact.
Suggested command: /impeccable layout

## Persona Red Flags

**Jordan (first-timer):** "run" four times above the fold, never defined — Jordan wants a logo, not a run. First 1.5s of the panel is five empty hairlines in a dark box. The typography tile names "Reem Kufi Ink / El Messiri" and sets neither in its own face. "And the rest of it" is a dismissive label over Brand story, voice and values, which PRODUCT.md treats as core output.

**Riley (stress tester):** on /ar finds fallback headings, `FEFAF5#`, English `run · Sultana`, and the "How it works" screenshot showing "Do you have a business name in mind? / Back / Next" in English directly under a heading promising native Arabic. Notes the Arabic proof panel only demonstrates that an input brief can be displayed RTL — which every i18n'd site does — and proves nothing about generated Arabic. Notes the exemplar brand is English-briefed with four Latin-only marks.

**Casey (mobile):** replay finished before arrival; recovery is a 12px ghost text button. 11,174px of page with no section navigation (spine is lg: only). Nine FAQ summary rows are 24px tall — padding sits on `<details>`, not the summary, so the hit area is half the 44px minimum. 18 sub-44px targets on /en, 22 on /ar.

## Minor Observations

- "It matches because it was decided once." is an h3 styled `type-section` — visually a peer of every h2, semantically a subsection. No level skips otherwise.
- FAQ two-column grid flows across rows, so the two questions that unblock purchase land in the right column where scanning is weakest.
- Contact sheet bottom row leaves a 2-of-6-column hole; "Names, with reasoning" is ~50% empty.
- Pricing CTAs are not on a common baseline — Studio's sits 28px higher because its footnote adds a line.
- Palette and logo tile order mirrors in RTL, so the Arabic visitor sees the brand's primary colour last.
- The Payload crossfade is 500ms inside an 1150ms step, so for 43% of each step two panes overlap; at t≈4.2s the wordmark and palette print over the logo tiles.
- Clean on the hard stuff: 0 console errors, 0 missing alt across 23 images, 0 horizontal overflow at any width in either locale, all 20 focus stops carry a 2px visible outline, heading outline has no level skips.

## Questions to Consider

1. The thesis is "everything arrives at once and agrees" — visible in nine seconds of hero and one cream section. For the other 60% of the scroll the page is a competent template with a violet arc. Is "the run" the right organizing idea for the whole page, or only for the hero?
2. The exemplar is a Syrian kitchen briefed in English producing four Latin-only marks. If Arabic is the sharpest differentiator, why does the one brand shown in full not exercise it?
3. The convergence is the frame nine seconds is engineered to reach, and it is the emptiest image in the sequence. What if the hero ended by becoming the contact sheet — the panel dissolving into the cream section?
