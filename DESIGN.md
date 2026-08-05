---
name: Brandora
description: A dark room where every generated brand is the only thing lit.
colors:
  signal-violet: "#7240ff"
  indigo-core: "#5b5cfb"
  horizon-blue: "#3b82f6"
  bloom-violet: "#8f66ff"
  lit-violet: "#aa8cff"
  room-black: "#05070f"
  bench-navy: "#0a0f1c"
  riser-navy: "#121a2e"
  paper-white: "#ffffff"
  reading-grey: "#a3aec9"
  quiet-grey: "#7a86a1"
  success-green: "#22c55e"
  warning-amber: "#f5a524"
  danger-red: "#ef4444"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 6.2vw, 4.6rem)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  section:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.2rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.12em"
  arabic:
    fontFamily: "IBM Plex Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.85
    letterSpacing: "normal"
rounded:
  control: "0.875rem"
  card: "1.25rem"
  panel: "1.5rem"
  pill: "9999px"
spacing:
  grid: "1.25rem"
  card: "1.75rem"
  section: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.signal-violet}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.control}"
    padding: "0 1.25rem"
    height: "2.75rem"
  button-secondary:
    backgroundColor: "{colors.riser-navy}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.control}"
    padding: "0 1.25rem"
    height: "2.75rem"
  button-ghost:
    textColor: "{colors.reading-grey}"
    rounded: "{rounded.control}"
    padding: "0 1.25rem"
    height: "2.75rem"
  input:
    backgroundColor: "{colors.riser-navy}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.control}"
    padding: "0 0.875rem"
    height: "2.75rem"
  card:
    backgroundColor: "{colors.bench-navy}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.card}"
    padding: "1.75rem"
  badge-brand:
    backgroundColor: "{colors.signal-violet}"
    textColor: "{colors.signal-violet}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.625rem"
  nav-item-active:
    backgroundColor: "{colors.riser-navy}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.control}"
    padding: "0.625rem 0.875rem"
---

# Design System: Brandora

## Overview

**Creative North Star: "The Darkroom"**

The interface is the dark room. Every brand this product generates is a print
that comes out of it, and the print is the only thing carrying colour. That is
why the chrome sits at near-black and holds a single accent ramp: it is not
minimalism as a style preference, it is a room built so that whatever is pinned
up in it can be judged. A product that sells brand coherence cannot show a
customer's brand inside its own purple and expect to be believed.

So the register is a quiet instrument around loud work. Chrome is severe:
hairline edges mixed from white rather than drawn in grey, three tonal grounds
instead of borders, one accent that appears where something means something.
Expression is delegated outward — a project page adopts the palette and the
faces of the brand it is showing, and Brandora's own ramp withdraws to the
shell. The one place the chrome is allowed to be expressive is motion, and even
there it is bounded: nothing loops forever except a running job and a loading
skeleton.

The visual anti-reference is the admin template — same-size cards of icon plus
heading plus text, figures that restate a count nobody asked for, and a grey 1px
border around everything. Those were all present and all removed deliberately; a
change that reintroduces them is a regression regardless of how it looks in
isolation.

The row of stat tiles is the one item that came off that list, and it came off
by measurement rather than by taste. See the Measured Figure Rule.

**Key Characteristics:**

- Near-black navy ground with three tonal steps, never a grey border
- One accent ramp, violet through blue, used sparingly and never as text at full strength
- Light from the horizon: a gradient bottom edge on what matters, brand-tinted shadow around it
- The generated brand owns any region that displays it, with contrast guarded at runtime
- One light source, below the content, and everything lit takes it on its bottom edge
- Generous radii (14 / 20 / 24px) and a 150–300ms motion band that collapses entirely under reduced-motion
- Fully bilingual: every surface works in Arabic with RTL, on its own font stack
- The marketing pages are dark in both themes, by decision rather than by omission

## Colors

A single violet-to-blue ramp on a near-black navy ground, with everything else
reserved for the customer's own palette.

### Primary

- **Signal Violet** (`#7240ff`): The ramp's anchor and the product's identity. It is the mark's own violet, sampled from the artwork the client supplied, so the logo and the interface are the same colour by construction rather than by agreement. Fills the primary button, lights the active nav marker, tints focus rings and glows. It signals "this means something" — never used to decorate a surface that is merely present.
- **Indigo Core** (`#5b5cfb`): The middle of the brand gradient and the tint in the lifted shadow. Interpolated between the anchor and the blue end so the ramp keeps its shape after re-anchoring. Rarely used alone.
- **Horizon Blue** (`#3b82f6`): The ramp's cool end. Closes the marketing page's horizon arc and supplies the secondary stop in the lit card edge and icon chips.
- **Bloom Violet** (`#8f66ff`): The stop between Signal Violet and Lit Violet. It exists because light is drawn as a continuous ramp rather than as three swatches — it carries the marketing horizon's bloom and sits at 18% and 30% along the two arc gradients.
- **Lit Violet** (`#aa8cff` dark / `#5b33cc` light): The readable member of the family. Every piece of accent *text* uses this, never Signal Violet. Derived rather than picked: it is the tint of the anchor that lands at 7.57:1 dark and 7.53:1 light.

### Neutral

- **Room Black** (`#05070f`): The page. The dark room itself.
- **Bench Navy** (`#0a0f1c`): Panels and cards — the surface work is laid on.
- **Riser Navy** (`#121a2e`): Raised fills, chips, hover states, input grounds. What sits above the bench.
- **Paper White** (`#ffffff`): Primary text, and the ground a logo is drawn on when its brand has none.
- **Reading Grey** (`#a3aec9`): Secondary prose — subtitles, descriptions, meta that is meant to be read.
- **Quiet Grey** (`#7a86a1` dark / `#67708c` light): Labels, timestamps, hints. Present, not competing. Lifted from its original values after measurement: the old pair cleared 4.5:1 on the base ground and failed on every tinted surface above it, which is most of them.

**The Committed Dark Rule.** The app follows the reader's theme; the marketing
pages do not. Dark navy is a pinned brand commitment, so `/` and `/pricing`
carry `.world-dark`, a scope that re-declares the dark palette and stays dark
under `[data-theme='light']`. This is the one place in the product where a
surface refuses the toggle, and it refuses it deliberately — the alternative
was what shipped before: forty-four hex literals, no response to anything, and
body text hand-tuned to `white/35` at 3.11:1. A dark scope is not a licence for
literals; everything inside it still reads the tokens.

Borders are never a grey line. They are white mixed into the ground at 9%
(`--border`) or 16% (`--border-strong`), so an edge belongs to the surface it
sits on instead of being drawn on top of it.

### Named Rules

**The One Ramp Rule.** There is no second accent. Status colours aside, anything
that needs emphasis borrows from Signal Violet, Indigo Core or Horizon Blue. A
new colour entering the system is a design decision, not an implementation
detail.

**The Readable Accent Rule.** Signal Violet is 3.73:1 on Room Black — enough
under a button, not enough under words. Accent *text* is always Lit Violet,
which clears 7.5:1 in both themes. This is why the two values differ per theme
while the ramp does not. It applies to the gradient too, and it is what decides
how far that gradient is allowed to travel: every stop in `--brand-gradient`
has to carry a 14px white label, so the ramp runs 5.44:1 at its violet end,
7.00:1 in the middle and 9.47:1 at its deep blue top. Horizon Blue stays the
palette's blue; the gradient's own top stop is the deeper `#1e4585`.

**The Checked Tone Rule.** Every colour this system puts under text is verified
against its own ground, not assumed from a percentage. A `color-mix` at 42% of
its own background cannot reach 4.5:1 for any pair of colours in existence —
that is arithmetic, not a data problem — so guest-brand text tones are resolved
by stepping the mix until it clears the floor.

**The Rendered Light Rule.** The horizon arcs and their bloom are light, not
surfaces, so they interpolate across the ramp and through white rather than
stepping between named swatches. Their intermediate stops — pale violets,
pale blues, a white core — are samples along that ramp and belong to the
gradient definitions in the sidecar, not to the palette. Anything that is *not*
rendered light uses a named colour.

**The Guest Palette Rule.** On any surface displaying a generated brand, that
brand's palette owns the region and Brandora's ramp withdraws to the shell. The
guest palette is untrusted input: every colour that ends up under text is
contrast-checked at runtime and replaced when it fails, so a bad generation
degrades to plain rather than to unreadable. Secondary text on a guest ground is
mixed from that brand's own ink, never set to grey.

## Typography

**Display / Body Font:** Plus Jakarta Sans (with `ui-sans-serif`, `system-ui`)
**Arabic Font:** IBM Plex Sans Arabic (with `ui-sans-serif`, `system-ui`)

**Character:** One family carries the whole Latin system — a geometric humanist
sans with enough personality in its display weights to hold a hero, and enough
neutrality at 14px to disappear into a form. Arabic is not a fallback: it is a
separate stack with its own leading (1.85 against the Latin 1.6), because Arabic
letterforms need the room.

### Hierarchy

- **Display** (600, `clamp(2.6rem, 6.2vw, 4.6rem)`, 1.12, `-0.02em`): Marketing headlines only. Never inside the app. Available as `type-display`.
- **Section** (600, `clamp(2rem, 4vw, 3.2rem)`, 1.1, `-0.02em`): The heading that opens a marketing section. Available as `type-section`. It existed as a literal on five headings before it was a step, which is how one of them drifted a size away from the others.
- **Headline** (600, 2.25rem, 1.1, `-0.02em`): The one page-owning `h1` — a dashboard greeting, a brand's name on its identity plate.
- **Title** (600, 1.25rem, 1.3, `-0.02em`): Card and section headings.
- **Body** (400, 0.875rem, 1.6): All prose. Measure stays inside 65–75ch.
- **Label** (600, 0.75rem, 1.4, `0.12em`, uppercase): Section eyebrows above a group of content, and meta keys in a definition list.

One deliberate exception: the logo-direction composer sets its textarea at
16px against the app's 14px. It is the one field where someone writes a sentence
rather than fills a slot, it is read back before it spends credits, and 16px is
also what stops iOS zooming the page on focus.

### Named Rules

**The Word-Not-Letter Rule.** Headline motion splits on words, never on
characters. Character-level animation reads as a typewriter gimmick at display
size and it breaks Arabic outright, where letterforms join.

**The Tracking Floor Rule.** One negative value, `-0.02em`, from title size
upward, and never past `-0.03em` anywhere.

It used to scale with size — `-0.03em` at headline, `-0.035em` at display — and
that was correct while the display weight was 700. Negative tracking exists to
stop heavy letterforms colliding; the display step is 600 now, and holding the
tighter values on a lighter face reads as cramped rather than as tight. A
generated brand's own face is exempt: the specimen and the identity plate set
someone else's wordmark, and its spacing is not ours to assume.

**The Trailing Clause Rule.** Where a heading has a second clause, it drops to
the secondary ink (`type-trail`) rather than taking a second size or a second
colour. It is the cheapest way to give a headline a shape, and it is the one
type device the reference repeats on every section it has.

## Layout

A centred column, not a full-bleed grid. Content sits in `max-w-6xl` (72rem) for
app surfaces and `max-w-7xl` for marketing, with `px-6` rising to `px-10` from
large up. The app shell is a fixed left rail beside a scrolling main; the rail is
15rem open and 4.75rem collapsed, and it collapses itself on a project page,
where the document is the point.

Rhythm is three values doing most of the work: `1.25rem` between grid cells,
`1.75rem` inside a card, `2rem` between page sections. Asymmetry is used where
two things are not equally important — the brand book splits 7/5, not 6/6,
because the mark being decided outranks the system beside it.

Responsive behaviour is structural rather than proportional. Below `lg` the
side rail becomes a horizontal scrolling row, the 7/5 spread stacks, and
multi-column grids fall to one. Nothing merely shrinks.

**The No Dead Column Rule.** A persistent side region must earn its width down
the whole page. A rail holding four links above a screen-height of nothing is
the failure this system was rebuilt to remove; give it more to hold, or let it
collapse.

## Elevation & Depth

Depth comes from a single light source below the interface — the arc rising
behind the fold. Three tonal grounds establish the stack (Room Black → Bench
Navy → Riser Navy), and what matters gets a lit bottom edge: a gradient from
Signal Violet at 34% fading into near-transparent white by 38%, applied as a 1px
padding ring around an inner surface. A border cannot hold a gradient and a
background at once, which is why this is two elements rather than one.

Controls repeat the same gesture at their own scale. The primary fill runs
brightest along its bottom edge and sinks to a deep blue at the top; every other
control carries a faint neutral inner line along the top and an accent-tinted
one along the bottom. That is what makes a button and the horizon behind it read
as one idea instead of as a hero with some widgets on it.

Shadows are ambient, not structural — they say "this is above that", never
"this is a box". They are tinted with the page's own navy or with Indigo Core,
never black.

### Shadow Vocabulary

- **Soft** (`0 1px 2px rgba(5,8,20,.4), 0 12px 32px -16px rgba(5,8,20,.8)`): The resting state of any raised surface.
- **Lifted** (`0 2px 4px rgba(5,8,20,.35), 0 26px 56px -24px rgba(91,92,251,.55)`): Hover and active elevation. The indigo tint is what makes it read as light rather than as darkness.
- **Glow** (`0 0 0 1px violet/25%, 0 0 24px -4px violet/55%, 0 0 64px -8px violet/38%`): Reserved for the brand-carrying moment — a primary action, a running job. Both blur layers are centred rather than offset downward, and the wide one is deliberately enormous: measured off the reference, the ground 11px above its primary control still reads the accent at 15% and has not finished falling off by the edge of the frame. An offset shadow says "raised"; this says "lit", which is the difference between the reference's world and a dark template.

### Named Rules

**The Light From The Horizon Rule.** There is one light in this product and it
is below the content: the arc that rises behind the fold. Illumination therefore
enters at the *bottom* edge — of a card, of a control, of anything lit at all.

This replaces the Light From Above Rule, which said the same thing in the
opposite direction. What that rule was actually protecting survives untouched: a
uniform 1px outline on all four sides is what made this app read as a template
beside its own marketing, and a lit edge is still what replaced it. Only the
direction changed, and it changed because a ceiling light was being asserted
while the only light the product ever drew was the arc.

**The Tinted Shadow Rule.** No shadow in this system is pure black. Tint with
the ground's navy for weight, with Indigo Core for lift.

## Shapes

Three radii, and they mean different things: **14px** (`--radius-control`) for
anything you operate — buttons, inputs, nav items, chips. **20px**
(`--radius-card`) for a card. **24px** (`--radius-panel`) for a panel that
contains cards. Full pills are reserved for badges and status chips, where the
shape itself signals "this is a state, not a control".

Corners are generous by intent; combined with hairline edges it produces
surfaces that read as soft objects rather than as boxes. Nesting is avoided
rather than styled: a card inside a card is treated as a composition failure, so
an inner region drops to a plain region with a hairline rule instead of gaining
its own radius and shadow.

## Components

### Buttons

- **Shape:** Softly rounded (14px), 44px tall at default (`h-11`), 36px small, 52px large, 40px square for icon-only. `shape="pill"` is the marketing world's control shape and belongs only there — see the Reserved Pill Rule.
- **Primary:** The brand gradient, brightest along the bottom edge and sinking to a deep blue at the top, inside a wide accent halo that deepens on hover. This is the only gradient fill in the system and there is normally one per view. It no longer pans sideways on hover: that gesture belonged to a diagonal gradient, and moving a vertical one horizontally shows a reader nothing.
- **Secondary:** Riser Navy with a hairline border. **Outline:** transparent with a stronger hairline. Both carry the lit bottom edge. **Ghost:** text only until hover, then Riser Navy. **Danger:** solid red. **Link:** Lit Violet with an offset underline on hover.
- **Press:** every variant scales to 0.98 in 75ms. Transitions ease with `cubic-bezier(0.22, 1, 0.36, 1)`.

**The Reserved Pill Rule.** A full pill means "this is a state, not something
you operate" — it is what tells a Badge from a Button at a glance. The reference
makes every control a pill because it has no pill badges to collide with; the
app has both, so the pill shape stays on the marketing pages, which have badges
nowhere, and app controls keep the 14px control radius.

### Inputs / Fields

- **Style:** 44px tall, 14px radius, Riser Navy at 60% opacity, hairline border, 14px text, and the lit bottom edge every control carries.
- **Focus:** the border becomes Signal Violet and a 3px ring of violet at 22% blooms outside it — a glow, not an outline. The lit edges are restated alongside it rather than replaced, because `box-shadow` does not stack across rules and a field that loses its light on focus loses it exactly when someone is looking at it.
- **Error:** border switches to Danger Red via `aria-invalid`, so the state is driven by the attribute assistive technology already reads.
- **Textarea:** grows to fit its content up to a ceiling, then scrolls. A fixed-height composer that hides what was typed is a defect, not a constraint.

### Cards / Containers

- **Corner:** 20px, or 24px when the container holds other cards — set `--lit-radius` to the panel step and both the ring and its inner corner follow.
- **Background:** Bench Navy inside a lit 1px ring, lit along its bottom edge.
- **Chosen:** where one card in a set is the recommended one, its hairline goes solid accent and nothing else changes. No fill, no size, no second badge. It is the reference's whole "which one" device and it survives being seen at a glance.
- **Shadow:** Soft at rest, Lifted on hover, and only where the card is a link.
- **Padding:** 1.75rem.

### Badges

Full pill, 12px semibold text, tone as a 15%-opacity wash of its own colour with
that colour as the text. Status is never conveyed by colour alone — the word is
always present, and where a dot is used it sits beside a label.

### Navigation

The left rail. Items are 14px-radius rows with an icon and a label; the active
one takes a Riser Navy fill, an inset violet hairline, and a violet bar that
grows from nothing on the item you moved to, so the eye follows the change
rather than hunting for which row changed shade. Collapsed, labels become
screen-reader-only text plus a `title`, never bare glyphs.

### Brand Scope (signature)

The system's defining component is not visual furniture — it is the runtime
theme that lets a generated brand take a region over. A scope element carries
`--brand-paper`, `--brand-ink`, `--brand-accent`, `--brand-ink-soft`,
`--brand-ink-faint` and `--brand-line`, derived from the customer's palette with
WCAG relative luminance and swapped for readable fallbacks when the generated
values fail. Everything inside reads those variables, so a server component can
hand its whole subtree to another brand's colours through CSS instead of props.

### Stat Tile

A measured figure: a label in the `label` step, a delta, the value, and a
twelve-week sparkline. Four of them open the dashboard.

- **Value:** display face, semibold, ~1.875rem, and the font's *proportional*
  figures. `tabular-nums` gives every digit the width of a zero, which is right
  in a column of numbers and looks gappy on one large one.
- **Delta:** signed, against a period named in the accessible text, and **absent
  rather than zero** where there is no prior period to compare with. Flat is its
  own state — neither arrow, no status colour.
- **Sparkline:** one series, so no legend; the label names it. Muted ink, 2px,
  with only the final segment and its endpoint in the accent. A flat series is
  drawn on the mid-line rather than stretched to fill the box, because a
  straight line at full height reads as a value at its maximum.
- **Direction is separate from goodness.** Only a metric with a real direction
  gets green or red, and the arrow carries the direction so colour is never
  alone in saying it.

**The Measured Figure Rule.** This composition was banned outright — "a row of
stat tiles whose largest type is the digit 1" — and the ban was lifted after
three versions of the dashboard were built and measured against a twelve-week,
nine-brand account. The tiles started 50px lower down the page than the contact
sheet they replaced and still put six brands in the fold against its two.

What the ban was protecting is now the rule, and it is stricter than a ban: a
figure earns its tile by being measurable. Every series is bucketed from a real
timestamp. Where the data cannot support a trend the tile shows none rather than
a decorative line. A level takes no percentage — credits going from 36 to 494 is
"+1,272%", arithmetically true and meaningless, because the denominator is
whatever the account happened to hold at an arbitrary earlier moment. And a
metric with no good direction says so: spending credits is what credits are for.

The corollary is that removing a figure is a design decision, not a data one.
"Brands finished" has no tile because a project's completion is current state
with no date beside it; its weekly series would be creation dates filtered by
today's status, a number that rewrites its own history.

### Specimen (signature)

A brand shown as itself: its mark centred on its own paper, its name set in its
own heading face, its palette laid along the base as the sheet's own edge. Not a
container around a database row — the card *is* the brand's ground. Used as the
unit of the even grid on the dashboard and the projects list.

One size, and no lead frame. Marking the newest brand by printing it across two
columns was defended on the grounds that a grid of identical cells is a
spreadsheet — which is true of cells that are chrome and false of these. A
specimen wears its own brand's paper, ink and palette, so six of them are six
different objects without any help from the layout, and measured at nine brands
the lead frame cost four of its neighbours their place in the fold.

## Do's and Don'ts

### Do:

- **Do** delegate colour outward on any surface showing a generated brand, and contrast-check every guest colour that ends up under text.
- **Do** use Lit Violet (`#aa8cff` / `#5b33cc`) for accent text and Signal Violet (`#7240ff`) for fills. They are not interchangeable.
- **Do** mix borders from white at 9% or 16% into the ground rather than drawing a grey line.
- **Do** put a lit gradient edge along the *bottom* of what matters and a plain hairline on what does not.
- **Do** let a rule that spans a page fade out before it reaches the edges. A line running corner to corner is the clearest signal a page is a template.
- **Do** pick the radius by role: 14px to operate, 20px for a card, 24px for a panel of cards.
- **Do** keep interface motion in the 150–300ms band, ease entrances out and exits in, and collapse all of it under `prefers-reduced-motion`.
- **Do** design both directions. Arabic uses its own stack at 1.85 leading, and every layout uses logical properties.

### Don't:

- **Don't** clip the brand gradient to text. It was removed for legibility: part of every glyph sits on the lowest-contrast stop, and the words vanish entirely where the clip is unsupported.
- **Don't** introduce a second accent colour, or a solid grey 1px border, or a shadow made of pure black.
- **Don't** nest a card inside a card. Drop the inner one to a plain region with a hairline rule.
- **Don't** build a page as a stack of same-size cards of icon plus heading plus text. That one stands.
- **Don't** show a figure this system cannot measure — no invented trend, no percentage on a level, no delta against a period nobody named. See the Measured Figure Rule.
- **Don't** leave a persistent side rail holding less than a screen of content — give it more or let it collapse.
- **Don't** animate headlines letter by letter; split on words, because Arabic letterforms join.
- **Don't** signal a state with colour alone; the word rides with the dot.
