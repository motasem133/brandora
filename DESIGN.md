---
name: Brandora
description: A dry studio board in daylight, where a generated brand is judged on light paper.
colors:
  board: "#e7e3da"
  sheet: "#ffffff"
  raised-fill: "#faf8f4"
  ink: "#191816"
  ink-secondary: "#57534a"
  ink-muted: "#635e54"
  ink-accent: "#5b33cc"
  board-night: "#16150f"
  sheet-night: "#1f1d17"
  raised-fill-night: "#2a2721"
  ink-night: "#f3f0e8"
  ink-secondary-night: "#bab4a6"
  ink-muted-night: "#a39c8d"
  ink-accent-night: "#aa8cff"
  signal-violet: "#7240ff"
  bridge-indigo: "#5b5cfb"
  signal-blue: "#3b82f6"
  ramp-top: "#1e4585"
  success: "#166534"
  warning: "#92400e"
  danger: "#b91c1c"
  success-night: "#22c55e"
  warning-night: "#f5a524"
  danger-night: "#f87171"
  room-black: "#05070f"
  room-surface: "#0a0f1c"
  room-elevated: "#121a2e"
  room-ink: "#ffffff"
  room-ink-secondary: "#a3aec9"
  room-ink-muted: "#7a86a1"
typography:
  display:
    fontFamily: "Familjen Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.2rem, 1rem + 5vw, 4.6rem)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Familjen Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 0.9rem + 3.2vw, 3.2rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Familjen Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Spline Sans Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.16em"
  arabic:
    fontFamily: "Readex Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.85
    letterSpacing: "normal"
  marketing-display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.2rem, 1rem + 5vw, 4.6rem)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.02em"
rounded:
  control: "0.875rem"
  card: "1.25rem"
  panel: "1.5rem"
  pill: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.875rem"
  md: "1.5rem"
  lg: "1.75rem"
  xl: "2.5rem"
  section: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.signal-violet}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "0 1.25rem"
    height: "2.75rem"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.signal-violet}"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "{colors.raised-fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 1.25rem"
    height: "2.75rem"
  button-ghost:
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    padding: "0 1.25rem"
    height: "2.75rem"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    height: "2.75rem"
  button-link:
    textColor: "{colors.ink-accent}"
  badge-neutral:
    backgroundColor: "{colors.raised-fill}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.625rem"
  badge-brand:
    textColor: "{colors.ink-accent}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.625rem"
  card:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "1.75rem"
  panel-sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "1.75rem"
  input:
    backgroundColor: "{colors.raised-fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 0.875rem"
    height: "2.75rem"
---

# Design System: Brandora

## Overview

**Creative North Star: "The Board"**

A dry studio board in daylight, with sheets of work laid on it. The Darkroom
that preceded it argued that a near-black room lets the print be the only lit
thing; that is a good idea about photographs and the wrong one about brands. You
cannot judge a colour in the dark, and most generated brands are drawn on light
paper — an example brand's own background is `#ffffff` — so a near-black chrome
forced every specimen into a bright rectangle in a void. The board is the
answer: a warm, matte ground (`#e7e3da`), white sheets on it, and shadow rather
than light doing the lifting. `[data-theme='dark']` is the same studio after
dark, not an inversion: the board keeps its warmth and the sheets stay the
lightest thing in the room.

The Darkroom did not die — it was **scoped**. `.world-dark` is the retained
marketing world on `/`, `/pricing`, `/brand-kit` and the legal pages, because
the brand is dark on purpose and that is a pinned commitment rather than a
default. `.world-light` is the guest scope: a region handed to a generated
brand, painted in the customer's own checked ink. The app itself is the board,
and the board is arriving as a `:root` scope while twenty-three routes migrate
onto it one at a time.

The board has **three registers**, and the boundary between them is a single
question: *does this surface show something the product generated?* **Wall** —
generated work pinned up (dashboard, projects, brand page, content library):
sheets, cast shadows, gaps visible. **Bench** — one thing at working size with
tools at its edges (onboarding, the run, Content Studio composer, website
builder). **Desk** — squared to a grid, never pinned, tabular figures (billing,
settings, admin, auth). Nothing generated is ever tabulated; nothing financial
is ever pinned.

**Key Characteristics:**
- Warm matte ground, white sheets, warm shadows — never a blue or black shadow
- One accent ramp, pinned to the logo, and used as little as possible
- Depth by cast shadow and tonal step, not by glow
- Five faces with five jobs; the mono face is the machine's voice
- Every colour under text carries a measured contrast number in the source
- Three registers with a one-question boundary

## Colors

A warm neutral system with one violet ramp held in reserve; the palette's whole
job is to stay quiet enough that a generated brand next to it is the loud thing.

### Primary
- **Signal Violet** (`#7240ff`): Sampled from `logo.png` and pinned. It fills the
  primary control's gradient, draws every `:focus-visible` outline, tints the
  field focus bloom and the interactive hover border. It is the pin and nothing
  else on the board.
- **Bridge Indigo** (`#5b5cfb`): The interpolated midpoint of the ramp; exists so
  the gradient keeps its shape between the violet anchor and the blue end.
- **Signal Blue** (`#3b82f6`): The cool end of the ramp. Chrome only.
- **Deep Ramp Blue** (`#1e4585`): The top stop of `--brand-gradient`, farthest
  from the light. Measured white-on-fill down the ramp: 5.44:1 at the violet
  bottom, 7.00:1 at the indigo middle, 9.47:1 at the blue top — every stop has to
  carry a 14px label, which is what decided how dark the top could go.
- **Deep Accent Ink** (`#5b33cc`): Accent *text* on the board. See the Readable
  Accent Rule.

### Neutral (the board, daylight)
- **Board** (`#e7e3da`): The ground. Warm, matte, mid-light.
- **Sheet** (`#ffffff`): Anything laid on the board — cards, panels, the auth
  sheet, a specimen's paper.
- **Raised Fill** (`#faf8f4`): A fill lifted out of a sheet: inputs, badges,
  hover states, quiet rows.
- **Ink** (`#191816`), **Secondary Ink** (`#57534a`), **Muted Ink** (`#635e54`):
  Muted is not the obvious lighter value — `#7c766b` reads fine on a sheet at
  4.51 and falls to **3.52** on the board itself, and the board is what most
  muted text actually sits on. `#635e54` measures **5.03** on the board, **6.44**
  on a sheet, **6.07** on a raised fill.
- **Hairlines**: mixed from the ink at 11% (`--border`) and 18%
  (`--border-strong`), never drawn as a grey line.

### Neutral (the board, night)
- **Night Board / Sheet / Raised Fill** (`#16150f` / `#1f1d17` / `#2a2721`) with
  **Night Ink** (`#f3f0e8`), secondary `#bab4a6`, muted `#a39c8d` (**5.46** on
  the raised fill, the tightest ground here) and accent `#aa8cff`.

### Neutral (`.world-dark`, marketing only)
- **Room Black / Room Surface / Room Elevated** (`#05070f` / `#0a0f1c` /
  `#121a2e`), **Room Ink** (`#ffffff`), secondary `#a3aec9`, muted `#7a86a1`
  (lifted from `#6f7b96`, which measured 4.36:1 on tinted surface variants and
  4.08:1 on elevated). Borders are translucent white at 9% and 16%; a hard grey
  border is the single thing that makes a dark interface look like a template.

### Tertiary (status)
- **Success / Warning / Danger**, daylight (`#166534` / `#92400e` / `#b91c1c`),
  night (`#22c55e` / `#f5a524` / `#f87171`). Night danger is `#f87171` at **5.38**
  on the raised fill, where the Darkroom's `#ef4444` fell to **3.96** and would
  have shipped failing.

### Named Rules

**The One Ramp Rule.** There is no second accent. Status colours aside, anything
that needs emphasis borrows from Signal Violet, Bridge Indigo and Signal Blue.

**The Readable Accent Rule.** Signal Violet is **4.21:1** on the board — enough
under a control, not under words. So accent *text* is `#5b33cc` in daylight and
`#aa8cff` at night. In `.world-dark` it is `#aa8cff` at **7.57:1**. The value
differs either side; the ramp does not.

**The Ink Light Rule.** On the board, decorative light is drawn in **ink**, not
in the accent. `--accent-surface` is re-pointed at `color-mix(in srgb, #191816
13%, transparent)`, which moves `lit`, `bloom`, `rail`, `rail-node` and
`pulse-ring` in one declaration. Left pointing at the ramp, every card wore a
violet gradient along its bottom and the accent stopped meaning "this matters"
the moment it appeared on all of them.

**The Checked Tone Rule.** Every colour this system puts under text is verified
against the ground it will actually sit on, not against the friendliest one, and
the measured number is recorded next to the token. A muted token with no headroom
is a token that fails wherever a surface is tinted at all.

**The Guest Palette Rule.** On any surface showing a generated brand, that brand
supplies the colour. `.world-light` re-points the semantic chrome names at the
`--guest-*` variables `lib/brand-theme.ts` emits, so `text-fg-secondary`,
`border-line` and `bg-surface` keep working and resolve to the customer's ink.
Nothing in that scope is a literal, greys are absent (grey on a coloured ground
reads as dirt: secondary ink and hairlines are mixed from the brand's own ink),
and **the ramp is deliberately absent** — `:focus-visible` draws from
`--brand-primary`, and a guest palette allowed to shadow it renders an invisible
focus ring on its own section. Chrome tokens are not shadowable by untrusted
input, and a generated palette is untrusted input even when it is our own example
brand.

**The Committed Dark Rule.** The app follows the reader's theme; the marketing
pages do not. `.world-dark` stays dark under `[data-theme='light']` because the
brand is dark by commitment, not by category default. The default theme is now
daylight: the board's thesis is that a brand cannot be judged in the dark, so
opening the product in a night room would ship the argument backwards. Only the
*absence* of a choice changed meaning; a stored `dark` still gets dark.

**The Colour Arc Rule.** A marketing section is either chrome or it is a guest,
never both. A section that hands itself to a generated brand takes that brand's
whole palette, including its decorative light (`--accent-surface` in
`.world-light` is `var(--guest-accent)`); a chrome section keeps ours.

**The World Ground Rule.** `body:has(> .world-dark)` paints the document
`#05070f`. A world scope sits on a div, so it paints itself and its subtree — but
the body is painted from the document's own tokens, which are the board's, and
rubber-banding a dark marketing page revealed a warm board underneath it. The
document takes its ground from the world its page actually opened in.

## Typography

**Display Font:** Familjen Grotesk (app), Bricolage Grotesque (marketing only,
variable across `opsz` as well as `wght`)
**Body Font:** Hanken Grotesk — warmer and narrower than the face it replaced,
which is what lets a dense table stay quiet at 13px
**Mono Font:** Spline Sans Mono, shipped at 400 and 500 only
**Arabic Font:** Readex Pro

**Character:** A grotesque with enough shape to sit above a customer's own mark
without competing with it, over a warm workmanlike interface face, with a
monospace that exists to mark the difference between what the product said and
what the pipeline emitted.

### Hierarchy
- **Display** (600, `clamp(2.2rem, 1rem + 5vw, 4.6rem)`, 1.12, `-0.02em`): The
  one largest thing on a page. The middle clamp term carries a rem as well as a
  vw — a pure `vw` is frozen against the reader's own font size, and at 200% root
  this heading grew 21% while body grew 125%, collapsing the display-to-body
  ratio from 4.1 to 2.5 for exactly the person who most needed it.
- **Headline / Section** (600, `clamp(1.75rem, 0.9rem + 3.2vw, 3.2rem)`, 1.1):
  Section titles. The `1.75rem` floor exists because both clamps used to bottom
  out 3.2px apart at 390px, which left the page with no display step at all on a
  phone.
- **Title** (600, `1.25rem`, 1.3, `-0.02em`): A heading on a card. Hand-rolled in
  eight places before it was a token, where it drifted to four different sizes.
- **Body** (400, `0.875rem`, ~1.6): Everything else. Prose is capped near 46ch
  where it sits beside other content.
- **Label / Eyebrow** (mono, 500, `0.6875rem`, `0.16em`, uppercase): The
  product's own quiet companion to a heading.

### Named Rules

**The Machine Voice Rule.** Anything the pipeline emitted is set in Spline Sans
Mono — credit figures, file dimensions, dates, hex codes, log lines, elapsed
time. Anything we wrote is not. That is the whole tell. Nothing may set a weight
heavier than 500 on it: the face has no bold to draw and the browser would
synthesise one.

**The Isolated Value Rule.** A machine value inside a paragraph carries
`machine-value` (`direction: ltr; unicode-bidi: isolate`). Hex codes, routes and
hostnames have neutral characters at their edges, and the bidi algorithm resolves
a neutral by its surroundings — inside an Arabic paragraph `#1B3A3A` renders as
`1B3A3A#` and `/home` as `home/`. A hex is something a customer copies and a
route is something they type.

**The RTL Display Rule.** Under `[dir='rtl']`, both `--font-display` and
`--font-sans` re-point to Readex Pro, at the variable rather than at the
utilities. Appending the Arabic face to the end of the Latin stack looks like the
textbook answer and does not work: next/font's metric-adjusted fallback is
declared `local("Arial")`, Arial has Arabic coverage, and it answers first. 451
Arabic glyphs were rendering in Arial before this. `--font-mono` is left alone —
its content is Latin and should stay monospaced.

**The Tracking Floor Rule.** One negative value, `-0.02em`, from title size
upward and never below it. Arabic drops negative tracking entirely and takes its
own leading (1.4–1.85): joined letterforms are pulled into each other by negative
letter-spacing rather than tightened, and Arabic carries vowels above the line.

**The Marketing Pairing Rule.** Bricolage Grotesque is declared on
`.world-dark, .world-light` only. The app keeps one display family and the page
that sells typography gets a pairing; every component reading `--font-display`
follows the scope it is rendered inside.

## Layout

The app shell is a single centred column: `max-w-[90rem]`, `px-6` rising to
`lg:px-10`, `py-10`, with content arriving on `animate-fade-up` rather than
snapping in. Desk surfaces narrow further — billing runs at `max-w-5xl` with
`space-y-12` between its blocks. Bench surfaces have no navigation and no sidebar
at all: `min-h-dvh`, centred, one thing at working size. The auth sheet is
`max-w-[26rem]`.

Rhythm is a small set of steps used consistently: `gap-4`/`gap-6` between
siblings, `p-7` inside a card (`sm:p-9` on a standing panel), `mt-5` under a
heading, `py-3.5` per row in a list of figures, `space-y-12` between page
sections. Controls stand on a 36–52px height ladder (`h-9` / `h-11` / `h-13`),
and a pressable target clears 44px on the threshold screens.

**The Register Boundary Rule.** Ask one question of a surface: does it show
something the product generated? Yes → **wall** (sheets, cast shadows, gaps
visible) or **bench** (one thing at working size, tools at its edges). No →
**desk** (squared to a grid, tabular figures, never pinned). Nothing generated is
ever tabulated; nothing financial is ever pinned.

**The Tabular Figure Rule.** Every desk figure is `tabular-nums`. A column of
credit balances or order totals that shifts horizontally between rows is a column
nobody can scan.

## Elevation & Depth

Depth on the board is a **cast shadow plus a tonal step**, and nothing else.
Board → sheet → raised fill is three warm steps, and a sheet is lifted by its own
shadow. Shadows are warm because the shadow of paper on board is not blue:
`rgba(60, 52, 38, …)`, always with an offset and a blur, never a zero-offset
halo. At night the same shadows are drawn in black at higher opacity.

### Shadow Vocabulary
- **Soft** (`0 1px 1px rgba(60,52,38,0.1), 0 10px 22px -10px rgba(60,52,38,0.3)`):
  A sheet resting on the board. The default for cards and standing panels.
- **Lifted** (`0 2px 3px rgba(60,52,38,0.12), 0 26px 44px -18px rgba(60,52,38,0.42)`):
  A sheet picked up — hover on an `interactive` surface, and the auth sheet.
- **Primary control** (`0 1px 1px rgba(60,52,38,0.18), 0 8px 16px -8px rgba(60,52,38,0.55)`),
  **hover** (`0 2px 3px …, 0 14px 24px -10px rgba(60,52,38,0.6)`): the primary
  control's own weight, as a token.
- **Hairline inset** (`inset 0 1px 0 0` ink at 5%): the single line a control
  carries on the board, where the Darkroom carried two.

### Named Rules

**The Lifted Not Lit Rule.** A control on a board is lifted, not lit.
`--shadow-primary` and `--shadow-primary-hover` exist as tokens precisely because
the halo was three literals reading `--brand-primary` inline — the one lit thing
in the product a scope could not move, since the fill has to stay violet. On a
dark ground that halo reads as light; on a board in daylight it reads as haze.

**The Light From The Horizon Rule — retired in the app, retained in marketing.**
It said: there is one light in this product, it is the arc rising behind the
fold, and everything lit is lit from below. That is still exactly true inside
`.world-dark`, where `--lit-inset` carries a neutral top edge and an
accent-tinted bottom one, `glow-brand` is two centred halos rather than a drop
shadow, and `bloom` puts a source inside a card. It is **dead on the board**: a
board in daylight has no horizon to rise from. The `lit`, `bloom` and radial-wash
compositions were removed from the dashboard shell, the billing panel, the
onboarding bench and the auth sheet rather than recoloured — keeping them would
have been the tell that the world was repainted rather than replaced. The
utilities survive because the marketing world still uses them, and because
`--accent-surface` keeps them honest wherever they do appear.

**The Tinted Shadow Rule.** No shadow in this system is pure black. Warm brown on
the board, black-at-opacity at night, ink-mixed in a guest scope.

**The Rendered Light Rule.** Light is drawn, never faked with a decorative image.
Anything that glows reads `--accent-surface`, so a scope can move all of it at
once.

## Shapes

Three radii and a pill, and they are semantic rather than sizes. Controls take
`0.875rem` (14px), cards `1.25rem` (20px), panels `1.5rem` (24px). A chip is
something you operate, so it takes the control radius. The default button shape
is a **full pill**, in both worlds — the reference world puts every control on a
pill, so the shape stopped distinguishing a control from a state and the
distinction moved onto the light. `shape="control"` survives for the pressable
surfaces a pill would misdescribe: a full-width panel, a swatch, a tile with
content in it.

Borders are hairlines mixed from the ink, applied globally (`* { border-color:
var(--border) }`) so a bordered element never has to name its colour.
`rule-fade` draws a rule that fades out before it reaches either edge — a
full-bleed line is the clearest signal that a page is a template; the same line
stopping short reads as a horizon.

## Components

### Buttons
- **Shape:** Full pill by default (`9999px`); control radius (14px) on the
  content-bearing exceptions.
- **Sizes:** `sm` 36px / `md` 44px / `lg` 52px / `icon` 40px square, at 14px label
  weight 600 (16px at `lg`).
- **Primary:** The vertical brand gradient (`--brand-gradient`, violet at the
  bottom climbing to deep blue at the top) with white label, carrying
  `--shadow-primary`. Hover deepens the shadow; it no longer pans its fill, which
  was a gesture that belonged to a 135° gradient and moves nothing visible on a
  vertical one.
- **Secondary / Outline:** Raised fill or transparent, hairline or strong
  hairline border, `control-lit` inner edge.
- **Ghost:** No fill at rest, so nothing to light; the moment hover gives it a
  surface, the surface takes the same edges every other control has.
- **Danger:** Solid danger fill with white inner edges at 10% and 28% — a violet
  edge on a red button is a second accent arriving through the back door.
- **Link:** Accent ink, underline on hover, offset 4.
- **Press:** `active:scale-[0.98]` at 75ms; transitions run 200ms on
  `cubic-bezier(0.22, 1, 0.36, 1)`.

### Badges
- **Style:** A flat wash at 15% of its tone, pill, 12px text, height from padding
  rather than from a control's 36px pressable floor.
- **Tones:** neutral (raised fill), brand (violet wash + accent ink), success,
  warning, danger.

**The Lit Control Rule.** A Button always carries a source — a fill with a shadow,
or the lit inner edges. A Badge never carries one: no fill gradient, no shadow,
no lit edges, no border, no hover. Now that both are pills, the light is the only
thing telling a control from a state.

### Cards / Containers
- **Corner Style:** Card 20px, panel 24px.
- **Structure:** `Card` is two elements — an outer that carries the gradient edge
  and an inner that carries the surface — because a single bordered box cannot do
  both, and a uniform 1px outline is what made every screen read as a template.
  On the board that outer edge resolves to ink at 13%, so it reads as a soft
  bevel rather than a violet rim.
- **Background:** Sheet white; a raised fill for quiet interior blocks.
- **Shadow:** Soft at rest, lifted on hover for anything `interactive`.
- **Padding:** `1.75rem` (28px), rising to `2.25rem` on a standing panel.
- **Headings:** `CardTitle` renders an `h2` by default — it was an `h3` under a
  page `h1` on eight routes, which is a hole in a screen reader's heading list.

### Inputs / Fields
- **Style:** 44px tall, control radius, raised fill at 60%, hairline border,
  14px ink.
- **Focus:** `field-lit` carries the inset edge *and* the focus bloom in one
  declaration, plus a violet border. Written as two rules the ring replaces the
  edges instead of joining them, and the field loses its light at the exact
  moment someone is looking at it.
- **Error / Disabled:** `aria-[invalid=true]` swaps the border to danger;
  disabled drops to 50% and `not-allowed`.
- **Focus, globally:** `:focus-visible` is a 2px Signal Violet outline at 2px
  offset, and it is never shadowable by a guest palette.

### Navigation
Nav is a frosted bar (`glass`: the ground at 72% behind a 14px blur and 1.4
saturate) over scrolling content, with a `rule-fade` rather than a full-bleed
border underneath.

### Motion
Durations sit in the 150–300ms band; entrances ease out (`--ease-out-soft`),
exits ease in, arrivals of a modal scale in on `--ease-spring`. Stagger comes
from a `--i` index and caps at 480ms, so a long list never leaves its last row
waiting. Only two things loop: a running generation's pulse and a loading
skeleton's shimmer.

**The Reduced Motion Rule.** `prefers-reduced-motion` removes motion and keeps
feedback. Animations collapse to one frame and transforms are dropped, but
colour, background, border, shadow and opacity keep transitioning at 120ms — a
colour easing over 100ms is not motion, it is the interface answering. The two
states that exist only as movement get a still form instead of nothing: the
shimmer becomes a steady tint, the pulse a static ring.

## Do's and Don'ts

### Do:
- **Do** ask the register question first: generated work goes on the wall or the
  bench; money and settings go on the desk.
- **Do** lift a sheet with a warm cast shadow (`rgba(60,52,38,…)`) and a tonal
  step, never with a halo.
- **Do** set accent text at `#5b33cc` in daylight and `#aa8cff` at night, and
  reserve `#7240ff` for fills, focus and edges.
- **Do** set anything the pipeline emitted in Spline Sans Mono at 400 or 500, and
  wrap it in `machine-value` when it sits inside a sentence.
- **Do** put every desk figure in `tabular-nums`.
- **Do** measure a new text colour against the *worst* ground it will sit on and
  record the number in the source next to it.
- **Do** reach for a semantic token (`bg-surface`, `text-fg-muted`, `border-line`)
  so a component re-skins by scope without being touched.
- **Do** let a guest scope own its colour completely, including its decorative
  light.

### Don't:
- **Don't** draw the Darkroom's horizon on the board. No `lit` gradient edge, no
  `bloom`, no radial wash behind a header, no glow behind a form. There is
  nothing for light to rise from.
- **Don't** point `--accent-surface` back at the ramp inside the app. A violet
  edge on every card is how the accent stops meaning anything.
- **Don't** let a generated palette bind `--brand-primary` or any chrome token;
  `--guest-*` is the only namespace an untrusted palette may write.
- **Don't** put Signal Violet under words on the board — 4.21:1 is a control's
  number, not a paragraph's.
- **Don't** introduce a second accent hue. Status colours aside, emphasis borrows
  from the one ramp.
- **Don't** set the mono face above weight 500; the browser will synthesise a
  bold that does not exist.
- **Don't** use negative letter-spacing on Arabic, or leave `--font-display`
  pointing at a Latin-only face under RTL.
- **Don't** give a Badge a shadow, a gradient or a hover — that makes it look
  like a control.
- **Don't** draw a hard grey border in `.world-dark`; borders there are
  translucent white at 9% and 16%.
- **Don't** run a decorative animation forever. Only a live generation and a
  loading skeleton loop.
- **Don't** register a Tailwind colour named `base`; it compiles `.text-base`
  into a colour instead of a font size.
