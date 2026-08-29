---
name: Brandora
description: A clear, bright product surface where the customer's own brand supplies the colour.
colors:
  ground: "#eff1f4"
  surface: "#ffffff"
  raised: "#f7f8fa"
  ink: "#14151a"
  ink-secondary: "#5a5f6b"
  ink-muted: "#676c79"
  ink-accent: "#5b33cc"
  signal-violet: "#7240ff"
  bridge-indigo: "#5b5cfb"
  signal-blue: "#3b82f6"
  ramp-top: "#1e4585"
  success: "#0f7350"
  warning: "#96620f"
  danger: "#b03a33"
  room-black: "#05070f"
  room-surface: "#0a0f1c"
  room-elevated: "#121a2e"
  room-ink: "#ffffff"
  room-ink-secondary: "#a3aec9"
  room-ink-muted: "#7a86a1"
typography:
  hero:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 1.2rem + 5.6vw, 6.5rem)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.045em"
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

**Creative North Star: "The Work Is The Colour"**

There is no metaphor. The app is not a board, a darkroom, a wall or a catalogue,
and a visitor is never asked to decode a world before they can use a screen. It
is a sidebar, a header, cards and tabs — the arrangement anyone who has used a
web app already knows — executed at a craft level that makes the familiar
arrangement worth looking at.

This was decided rather than defaulted to. Three metaphor worlds were built and
rejected, and the owner named the reason: a concept the user has to understand
is a tax the product cannot afford to charge, because the person on this screen
came to see their brand, not to admire ours. When *distinctive* and *instantly
obvious* pull against each other here, obvious wins, and the distinctiveness has
to come from somewhere that costs the user nothing.

It comes from three places:

**The colour belongs to the customer.** The chrome is a cool near-white with one
violet accent and nothing else. Every brand card, every banner and every
specimen is painted in that brand's own palette, so an account with ten brands
in it looks like nothing any other account looks like, and the marks sit on
grounds they were actually designed for. This is the one decision that is both
the prettiest thing on the screen and the most functional: a generated brand is
the loud thing because the room refuses to be.

**Depth is real.** Two-layer cast shadows — a tight contact shadow and a wide
ambient one — plus a specular top edge on anything lifted, and one quiet
authored light source behind the shell. Not blur, not glass, not a border
pretending to be elevation. The content panel floats above the ground; the
sidebar sits on it.

**Money is visible where it is spent.** The credit meter says what a balance is
worth in brands, not just what it is. The price rides on the button that spends
it. A refund reads `+13 cr` on the run that failed.

The bar is the craft level of Apple, Arc and Family — depth, motion, colour and
obvious beauty on first sight — and the owner named those three as the company
this should keep.

Light is not a default, it is read off the use scene: the person at this screen
is judging a generated palette, and most generated brands are drawn on light
paper. A dark chrome puts every specimen in a bright rectangle in a void, which
is the failure that ended the Darkroom and then ended the board's night as the
default. **There is no dark theme.** The app is light, full stop. A second theme was
carried for a while and then removed: the product exists to show a generated
palette, a generated palette cannot be judged on a dark ground, and a theme
nobody should use on the one screen the product is *for* is a whole parallel
palette to maintain for no one. Removing it also removed the only control in
the account menu that was a preference rather than an action.

`.world-dark` survives untouched as the retained marketing world on `/`,
`/pricing`, `/brand-kit` and the legal pages, because the brand is dark on
purpose there and that is a pinned commitment. `.world-light` survives as the
guest scope. What was replaced is the app.

**The registers are retired.** Wall, bench and desk described a world that no
longer exists, and the question they turned on — *does this surface show
something the product generated?* — is now answered by colour rather than by
composition. A surface showing generated work lets that work supply the colour;
a surface showing money or settings stays in chrome. Same boundary, no
vocabulary to learn.

**Key Characteristics:**
- Cool near-white ground, white panels, cool two-layer cast shadows — one theme,
  no dark
- The customer's palette owns every surface that shows their work
- One violet accent, used on exactly one control and the focus ring
- Depth by real shadow plus a specular edge, never by glass or blur
- Every colour under text carries a measured contrast number in the source
- No metaphor, no vocabulary, nothing to decode

## Colors

A warm neutral system with one violet ramp held in reserve; the palette's whole
job is to stay quiet enough that a generated brand next to it is the loud thing.

### Primary
- **Signal Violet** (`#7240ff`): Sampled from `logo.png` and pinned. It fills the
  primary control's gradient, draws every `:focus-visible` outline, tints the
  field focus bloom and the interactive hover border. It is the pin and nothing
  else in the app.
- **Bridge Indigo** (`#5b5cfb`): The interpolated midpoint of the ramp; exists so
  the gradient keeps its shape between the violet anchor and the blue end.
- **Signal Blue** (`#3b82f6`): The cool end of the ramp. Chrome only.
- **Deep Ramp Blue** (`#1e4585`): The top stop of `--brand-gradient`, farthest
  from the light. Measured white-on-fill down the ramp: 5.44:1 at the violet
  bottom, 7.00:1 at the indigo middle, 9.47:1 at the blue top — every stop has to
  carry a 14px label, which is what decided how dark the top could go.
- **Deep Accent Ink** (`#5b33cc`): Accent *text* in daylight. See the Readable
  Accent Rule.

### Neutral (daylight)
- **Ground** (`#eff1f4`): Cool near-white. Chosen so a warm customer palette and
  a cool customer palette are both guests, rather than one of them fighting the
  room.
- **Surface** (`#ffffff`): The floating content panel, cards, the auth sheet.
- **Raised Fill** (`#f7f8fa`): Inputs, quiet rows, chips, hover states.
- **Ink** (`#14151a`), **Secondary** (`#5a5f6b`), **Muted** (`#676c79`): Muted is
  measured against the *ground*, which is the tightest of the three. The comp
  this world was approved from used `#878c97`, which is **2.98** there and would
  have shipped every card's second line failing; `#676c79` is **4.64** on the
  ground, **5.25** on a panel, **4.94** on a raised fill.
- **Hairlines**: mixed from the ink at 10% and 17%, never drawn as a grey line.

### Neutral (`.world-dark`, marketing only)
- **Room Black / Room Surface / Room Elevated** (`#05070f` / `#0a0f1c` /
  `#121a2e`), **Room Ink** (`#ffffff`), secondary `#a3aec9`, muted `#7a86a1`
  (lifted from `#6f7b96`, which measured 4.36:1 on tinted surface variants and
  4.08:1 on elevated). Borders are translucent white at 9% and 16%; a hard grey
  border is the single thing that makes a dark interface look like a template.

### Tertiary (status)
- **Success / Warning / Danger** (`#0f7350` / `#96620f` / `#b03a33`), measured on
  the ground at **5.17**, **4.58** and **5.30**. The approved comp's `#12855a`,
  `#b5791c` and `#c4443c` measured **4.10**, **3.25** and **4.38** there and all
  three failed; a comp is a direction, not a token sheet.

### Named Rules

**The One Ramp Rule.** There is no second accent. Status colours aside, anything
that needs emphasis borrows from Signal Violet, Bridge Indigo and Signal Blue.

**The Readable Accent Rule.** Signal Violet is **4.77:1** on the ground — fine
under a control, thin for a paragraph. So accent *text* is `#5b33cc` (**6.65**)
in the app. In `.world-dark` it is `#aa8cff` at **7.57:1**. The value differs per
world; the ramp does not.

**The Ink Light Rule.** Decorative light is drawn in **ink**, not in the accent.
`--accent-surface` points at `color-mix(in srgb, #14151a 11%, transparent)`,
which moves `lit`, `bloom`, `rail`, `rail-node` and `pulse-ring` in one
declaration. Left pointing at the ramp, every card wore a violet edge and the
accent stopped meaning "this matters" the moment it appeared on all of them. The
one authored light source in this world is a single quiet radial behind the
shell, not a gradient repeated per component.

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

**The Committed Dark Rule.** `.world-dark` is dark by commitment, not by
category default, and it is a *scope* rather than a theme — a region of the
marketing pages, not a preference anyone sets. **The landing page left it on 27
August 2026**: that page argues by showing real generated work, and a near-black
ground is both the category's costume for an AI tool and the wrong light to
judge a palette in. The scope is unchanged and the other marketing pages still
use it; one surface opted out. The app has no dark at all: a
generated palette cannot be judged in the dark, and the product exists to show
generated palettes. A dark scope on marketing and no dark theme in the app is
one decision, not two in tension.

**The Colour Arc Rule.** A marketing section is either chrome or it is a guest,
never both. A section that hands itself to a generated brand takes that brand's
whole palette, including its decorative light (`--accent-surface` in
`.world-light` is `var(--guest-accent)`); a chrome section keeps ours.

**The World Ground Rule.** `body:has(> .world-dark)` paints the document
`#05070f`. A world scope sits on a div, so it paints itself and its subtree — but
the body is painted from the document's own tokens, which are the app's, and
rubber-banding a dark marketing page revealed the light ground underneath it. The
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
- **Hero** (600, `clamp(2.75rem, 1.2rem + 5.6vw, 6.5rem)`, 0.98, `-0.045em`):
  The landing page's first line, and nowhere else. It exists because the fold
  has a different job from a page heading: it has to hold someone who has not
  decided to read yet, and at Display's 4.6rem ceiling it did not — measured
  against three reference landing pages whose heroes run 100–150px, ours read as
  a document. 6.5rem lands at **100px** on a 1440px viewport and **44px** on a
  phone. Tracking goes to `-0.045em` because the Tracking Floor Rule's `-0.02em`
  is tuned for text sizes; at 100px it leaves the words looking unset.
  **Not a general step.** Anything reaching for this outside a marketing fold is
  using a hero size for a heading, which is how a page ends up with two things
  claiming to be the largest.
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
upward and never below it — with one exception, the Hero step at `-0.045em`,
because a floor tuned for text leaves 100px type looking unset. Arabic drops negative tracking entirely and takes its
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

**The Guest Colour Boundary Rule.** Ask one question of a surface: does it show
something the product generated? Yes → that work supplies the colour, and the
surface is painted from its palette. No → the surface stays in chrome, cool near
-white with one violet accent. This replaces the wall / bench / desk registers,
which described a world that no longer exists; the boundary they drew is the
same one, and it is now answered in colour rather than in composition, so there
is no vocabulary to learn before a screen can be built.

**The Tabular Figure Rule.** Every figure is `tabular-nums`. A column of
credit balances or order totals that shifts horizontally between rows is a column
nobody can scan.

## Elevation & Depth

Depth is a **two-layer cast shadow plus a specular edge**, and nothing else. A
tight contact shadow says the surface is touching; a wide, soft ambient one says
how far it is lifted. The specular top edge is what separates a surface that is
raised from a rectangle that is merely paler. Shadows are cool, because the
ground is cool and a warm brown shadow on a blue-grey ground reads as dirt. 

### Shadow Vocabulary
- **Soft** (`0 1px 2px rgba(20,21,26,.05), 0 4px 10px -3px rgba(20,21,26,.07)`):
  a card resting on a panel. The default.
- **Lifted** (`0 4px 8px rgba(20,21,26,.07), 0 34px 56px -16px rgba(20,21,26,.26)`):
  hover on an `interactive` surface, and the auth sheet.
- **Panel** (`0 1px 2px rgba(20,21,26,.05), 0 26px 60px -22px rgba(20,21,26,.28)`):
  the shell's own content panel, which floats above the ground while the sidebar
  sits on it. New in this world.
- **Primary control** (`0 1px 2px rgba(48,18,120,.4), 0 10px 20px -8px rgba(114,64,255,.6)`)
  and its hover: the one gradient control's own weight.
- **Specular edge** (`inset 0 1px 0 0 rgba(255,255,255,.9)`): invisible on a white
  panel by design; it does its work on the raised fill, the nav pill and the
  credit meter.

### Named Rules

**The Tinted Primary Rule — and what it replaced.** The primary control carries a
violet-tinted cast shadow. This is a deliberate reversal of the board's *Lifted
Not Lit Rule*, which held that a control on a board is lifted rather than lit
because a coloured halo in daylight read as haze. On this ground, at this craft
level, the one gradient control in the product is the thing the eye should find
first, and a tinted cast shadow is how it earns that without a second accent
appearing anywhere else. It is still a shadow — offset and blur — never a
zero-offset halo, and it is the **only** tinted shadow in the system.

**The Light From The Horizon Rule — retired in the app, retained in marketing.**
It said: there is one light in this product, it is the arc rising behind the
fold, and everything lit is lit from below. That is still exactly true inside
`.world-dark`, where `--lit-inset` carries a neutral top edge and an
accent-tinted bottom one, `glow-brand` is two centred halos rather than a drop
shadow, and `bloom` puts a source inside a card. It stays dead in the app. The
one authored light here is a single quiet radial behind the shell — one source,
top left, not a gradient repeated per component.

**The Tinted Shadow Rule.** No shadow in this system is pure black. Cool ink at
opacity in the app, violet only on the primary control, ink-mixed in a guest
scope, black at opacity inside `.world-dark`.

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
  That outer edge resolves to ink at 11%, so it reads as a soft
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
- **Do** ask the guest-colour question first: a surface showing generated work is
  painted from that work's palette; money and settings stay in chrome.
- **Do** lift a surface with two cool shadow layers and a specular top edge,
  never with a halo, a glass blur or a heavier border.
- **Do** set accent text at `#5b33cc`, and reserve `#7240ff` for fills, focus
  and the one tinted control shadow.
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
- **Don't** draw the Darkroom's horizon in the app. No `lit` gradient edge, no
  `bloom`, no radial wash behind a header, no glow behind a form. There is one
  light source and it lives behind the shell.
- **Don't** build a metaphor. No board, wall, darkroom, catalogue or manual. If a
  screen needs a paragraph to explain its own arrangement, it is the wrong
  arrangement.
- **Don't** point `--accent-surface` back at the ramp inside the app. A violet
  edge on every card is how the accent stops meaning anything.
- **Don't** let a generated palette bind `--brand-primary` or any chrome token;
  `--guest-*` is the only namespace an untrusted palette may write.
- **Don't** put Signal Violet under words — 4.77:1 is a control's number, not a
  paragraph's.
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
