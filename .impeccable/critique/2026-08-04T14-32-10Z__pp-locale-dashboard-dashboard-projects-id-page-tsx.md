---
target: the project page
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 5
timestamp: 2026-08-04T14-32-10Z
slug: pp-locale-dashboard-dashboard-projects-id-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Credit balance appears nowhere on a page whose main action costs 6 credits |
| 2 | Match System / Real World | 2 | `RICHTEXT` / `SERVICES` CMS block-type eyebrows shown to a founder |
| 3 | User Control and Freedom | 2 | No undo, no confirm on the 6-credit regenerate |
| 4 | Consistency and Standards | 2 | 4 gradient fills in one view vs DESIGN.md "one per view"; 10 nested-card hits vs an explicit Don't |
| 5 | Error Prevention | 1 | Enter in a pre-seeded textarea spends 6 credits immediately; 0 `role="dialog"` on the page |
| 6 | Recognition Rather Than Recall | 3 | Strong, but affordability requires remembering a balance from another page |
| 7 | Flexibility and Efficiency | 2 | 16 tab stops to reach the composer, no skip link, longest sections cannot collapse |
| 8 | Aesthetic and Minimalist Design | 2 | One sentence about icon derivation printed three times in one panel |
| 9 | Error Recovery | 2 | "Not enough credits" lives only in a `title` attribute on a disabled button |
| 10 | Help and Documentation | 3 | `logo-usage.tsx` is documentation-as-demonstration and genuinely excellent |
| **Total** | | **21/40** | **Acceptable — significant improvements needed** |

No heuristic scored n/a; this is an Operate surface and all ten apply.

## Design Specificity Verdict

**Specific where it matters, generic where it is longest — and the seam is visible on screen.**

The top ~1400px could not be lifted into another product: the identity plate sets the customer's name in their heading face on their paper, the canvas is drawn on the brand's own ground, and `brand-theme.ts` contrast-checks a guest palette — a problem only a product that generates palettes it doesn't control can have. Below the seam, ~3500 of 5964px is a CMS listing any SaaS could ship unchanged, including uppercase `RICHTEXT` block-type labels leaked into a customer's brand book. The specific part is what you see first; the generic part is what you spend the most time scrolling.

**Deterministic scan.** `detect.mjs` over the page and its 20 components: **0 findings, exit 0**. Broadened to whole directories: 3 (1 confirmed false positive — `broken-image` matched the literal `<img>` inside a JSDoc comment in `logo.tsx`). In-page overlay: **96 findings across 70 elements** — 48 `ai-color-palette`, 28 `low-contrast`, 10 `nested-cards`, 3 `dark-glow`, 3 `line-length` (~156 chars vs the documented 65-75ch), 1 `skipped-heading`, 1 `layout-transition`.

The CLI being clean while the overlay found 96 is the headline: static analysis of the source could not see any of this. Every real defect below needed either a rendered page or a human reading intent.

## Priority Issues

### [P0] Six credits of real money spend on a single Enter keypress
`logo-composer.tsx` sends on Enter without Shift. The textarea is **pre-seeded with the previous round's brief**, so it is non-empty on arrival: tab in, press Enter reflexively, a paid generation fires. Zero `role="dialog"` on the page; the balance is passed to `GenerationPanel` but never rendered near the composer; "Not enough credits" exists only in a `title` attribute. Contradicts PRODUCT.md principle 2 — "Nothing spends them without a deliberate act."
**Fix:** show live balance beside the cost; require Cmd/Ctrl+Enter to send; replace the title-only affordability message with a visible one.
**Command:** /impeccable harden

### [P1] `--brand-ink-faint` cannot pass AA for any palette — measured 2.46:1
`brand-theme.ts` mixes ink 42% into paper. That is mathematically capped near 2.5:1 even for pure black on pure white. It is used for the identity plate's meta line, the specimen's "Headings"/"Body" labels and the typography label. The file's own contrast machinery guards `ink` and `accent` and then hands this one out unchecked.
**Fix:** derive the faint tone by stepping the mix until it clears 4.5:1, using the same luminance function already in the file.
**Command:** /impeccable harden

### [P1] The documented Readable Accent Rule is violated in six components
DESIGN.md: "Accent text is always Lit Violet, never Signal Violet." `text-brand` (`#7c3aed`) is used as body text in `social-view`, `website-view`, `logo-variations`, `name-picker` — measured 3.02, 3.04, 3.10, 3.25, 3.36, 3.43:1. The system states the rule correctly and the code does not follow it.
**Command:** /impeccable polish

### [P1] Arabic renders the customer's slogan with the period on the wrong side, in three places
`.Built to be understood` in the identity plate, the typography specimen and the link preview. `lang` is set without `dir`, and `lang` has no effect on bidi reordering. `palette-grid.tsx` already carries a `dir="ltr"` with a comment explaining this exact failure — applied to a hex code, missed on the brand's tagline.
**Command:** /impeccable harden

### [P1] "Use this name" promises the kit follows; nothing regenerates
The hint reads "logos, website and social copy follow it". `selectBusinessName` updates one column. Pick a new name and the H1 says it while the wordmark 600px below still says the old one — Product Principle 1 broken inside one viewport by a control that said it wouldn't be.
**Command:** /impeccable clarify

### [P1] White on the gradient's blue end is 3.7:1
`--brand-secondary` `#3b82f6` closes the brand gradient; white 14px label text over that end fails AA. Affects every primary button.
**Command:** /impeccable polish

### [P2] Light theme muted text fails AA on plain white — 57 nodes
`--text-muted: #6d7794` measures 4.45:1 on `#ffffff`. Dark theme has no headroom either (4.36:1 on `#0d1323`).
**Command:** /impeccable polish

### [P2] The chosen-logo state is unreachable by keyboard
`logo-actions.tsx` renders the confirmed state as `disabled`, removing it from the tab order. A screen-reader user tabs past the canvas and never learns which logo is the brand's.
**Command:** /impeccable harden

### [P2] 57 of 63 interactive targets are under 44x44, unchanged on mobile
11 copy buttons at 30x22 and 8 download links at 59x16 fail even WCAG 2.5.8's 24x24 AA floor on one axis.
**Command:** /impeccable adapt

### [P2] The website and social sections are 3500px of un-collapsible CMS dump
Cards nested three deep, block-type eyebrows, same-size card stacks — three documented Don'ts, at the bottom of the page that removed them. Meanwhile Brand story and Variations, the smallest and most-read, are the ones folded away. Disclosure is exactly inverted.
**Command:** /impeccable distill

### [P3] Mobile identity plate compresses the brand name into a 126px column
`flex-1` means `flex-basis: 0%`, so the text column shrinks indefinitely and the row never wraps. The page's peak moment breaks on the device a founder uses to show someone.
**Command:** /impeccable adapt

## Persona Red Flags

**Alex (impatient power user, fifth client brand this month):** scrolls 5964px past a CMS dump to reach nothing he wants; loses 6 credits to muscle memory on a pre-seeded field; cannot see affordability without leaving the page; renames to "Kestrel" and ships a wordmark reading "Fixture Co".

**Sam (keyboard + screen reader):** 14 tab stops of shell before any page content, no skip link; the chosen-logo state is `disabled` and therefore unreachable — the only surviving signal is an `sr-only` span that does not render when a round has one concept; 22 simultaneous `aria-live` regions, when `palette-grid.tsx` explicitly solved that problem and the shared `CopyButton` did not inherit the fix; in Arabic, palette roles are announced in English because raw `Object.entries()` keys are rendered through `capitalize`.

## Minor Observations

- The identity plate's palette band still visibly stops two-thirds across when swatches are near the surround — the same defect the code comment claims to have fixed by dropping `background`. Needs dividers, not a different swatch selection.
- `usageFromLogo` prints verbatim twice and in paraphrase a third time in one panel, and breaks parallelism with its sibling captions.
- Heading outline skips `h2` to `h4` at "Brand voice"; the website and social sections have no section-level heading of their own.
- Five images carry `alt=""` while presenting meaning, including the 176px primary logo and the 382px social card.
- Line length reaches ~156 characters against the documented 65-75ch.
- No horizontal overflow at 390 or 768; zero console errors; RTL mirroring of rail, spread, arrows and band is correct.

## Questions to Consider

1. If the run is the product, why is the page organised by deliverable type instead of by decision? Everything decidable is in the top third; everything below is read-only output.
2. PRODUCT.md already records that the two-choice icon model was unusable and the intended end state is automatic selection. Is "choose a logo" a decision the product should ask for at all, or is it "approve, or ask for another round"?
3. The composer is a chat box that costs real money per message. Every other chat box is free to send. Should it look like a chat box, or like a purchase?
4. Nobody had viewed this page in Arabic before today, on a product whose stated differentiator is native Arabic generation. What changes if the Arabic view is the default during development rather than the one checked last?
