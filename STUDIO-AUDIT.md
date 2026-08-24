# Content, carousels and the logo choice — audit and direction

24 August 2026. Everything below was reproduced against the real code and the
local database; each finding names the file and the evidence. Nothing here is
inferred from reading alone unless it says so.

Design direction was produced with the Impeccable skill against `PRODUCT.md` and
`DESIGN.md`. Its interview step was skipped — the brief in the request was
specific enough and asked for directions, not a build.

---

## 1. Why the carousel does not use the chosen logo

Two independent causes. Both are live; fixing either one alone still leaves a
wrong mark on some surface.

### 1.1 Every frame flattens the mark to a white silhouette

`src/server/render/layouts.ts:95` and `:542`

```
const invert = contrast('#ffffff', ground) >= contrast('#000000', ground)
… style="object-fit:contain${invert ? ';filter:brightness(0) invert(1)' : ''}"
```

`brightness(0) invert(1)` destroys the artwork and keeps only its outline.

Evidence — the Brandora demo brand, chosen logo `logo-r2-emblem-badge.png`:

| The chosen file | What the frame draws |
|---|---|
| Purple sun, **navy star cut into its centre**, navy "Brandora" | One flat white sun, centre filled in, white "Brandora" |

The `identity` frame — the post whose entire subject is the mark — applies the
knockout unconditionally, so the brand's own logo post is guaranteed to show a
logo the customer never approved. A two-tone mark, a gradient mark, or any mark
whose meaning is in its counter-shape comes out as a blob.

There is already a real monochrome asset produced per brand (`variant:
monochrome`) and the untouched transparent original. Neither is used here.

### 1.2 Choosing a logo never re-renders the posts

`src/server/services/logos.ts:620-636` — `rederivePrimaryAssets` rebuilds
favicon, avatars, OG card, monochrome, traced SVG and the kit ZIP. It does not
touch `social_post`, and nothing else does either.

So: generate a kit, then change your logo, and the eight kit posts plus every
carousel you already made keep the old mark permanently — until a *paid* kit
rerun. The product's first principle is "the kit must agree with itself"
(`PRODUCT.md`); today it silently stops agreeing at the moment of the one
decision the brand screen exists to support.

---

## 2. Why "we are launching soon" produced a palette sheet

### 2.1 Only three layouts work without photography, and two of them ignore your words

`src/server/render/layouts.ts:23-32` — of eight layouts, five need a generated
photograph. Without a social kit the only usable frames are `statement`,
`identity`, `palette`.

`identity` (`:520`) and `palette` (`:454`) never render `copy.lead`. They are
brand-book specimen pages: the mark on a split field, and the four colours with
their **hex codes** and the font names.

So a three-frame carousel for a brand with no kit is:

1. your line, set large — the only frame that carries the brief
2. the logo, no words
3. `#1E293B primary · #7C3AED secondary · #3B82F6 accent · #FFFFFF background`

That third frame is the image you were shown for "we are launching soon". It is
working exactly as written — which is the problem.

### 2.2 The model is paid to write lines that are thrown away

`src/server/inngest/content.ts:160-200` asks the model for one line per
available layout, with a system prompt insisting the frames are "a sequence…
read in order", then maps every line onto its layout. Two of the three layouts
drop it on the floor. The customer pays for a three-beat argument and receives
one beat plus two reference pages.

### 2.3 The price describes a carousel the customer may not get

`src/server/billing/credits.ts:104-135` — `carousel: 3`, justified in comment as
"five rendered images". A project without a kit gets three frames for the same
three credits, and no surface says so before the button is pressed.

### 2.4 A fifth frame ships with an empty paragraph

With photography, the plan is `hero, statement, feature, detail, about`. The
`about` layout renders `escape(p.copy?.body ?? '')` (`layouts.ts:450`), and the
content pipeline only ever sets `{ lead, tail: null }` — so that frame draws an
empty text block.

### 2.5 Nothing chooses layouts by what the brief is about

`availableLayouts` picks by *what can be drawn*, in one fixed order, forever. A
launch announcement, a price change, a hiring post and a testimonial all get the
same frames in the same order.

---

## 3. Why the text can't be read, copied, or changed

`src/components/features/studio/content-library.tsx`

- A carousel's caption is a **two-line clamp with no expand**, no copy control,
  and its hashtags are never shown. Written types (`social_post`, `ad`) do get an
  open-and-copy treatment via `ContentText` — drawn types were left out.
- Frames are 64px `object-cover` thumbnails. No full-size view, no download, no
  per-frame text.
- There is no detail page for a piece at all. `getContentItem`
  (`db/queries/content.ts:110`) is dead code — nothing imports it.

**Editing was designed into the database and never built.** `content_items`
carries `rootId`, `parentId`, `version`, `isLatest`, `editedAt`, and the list
query already filters `isLatest = true` — but no code path ever writes a version
2 or sets `editedAt`, and `server/actions/content.ts` exposes exactly two
actions: generate, and count-pending. No edit, no regenerate, no delete.

---

## 4. Data loss: rebuilding a kit deletes past carousels

`src/server/services/social-kit.ts:325-332`

```
if (params.replace !== false) {
  await db.delete(generatedFiles).where(and(
    eq(generatedFiles.projectId, params.projectId),
    eq(generatedFiles.kind, 'social_post')))
}
```

Content Studio frames are stored as `social_post` with a `contentItemId` in
metadata. The delete does not exclude them, so **every kit rebuild destroys the
images of every carousel and story ever generated for that project**, while the
`content_items` rows survive pointing at ids that no longer exist.

Evidence, local database, project `84dfdc12` (Brandora):

- carousel `c5eef1e1` drawn 10 Aug 20:27 — frames `9c153379`, `f0d85a61`, `9772360a`
- kit rerun 10 Aug 20:34-20:35 wrote `post-hero.png` … `post-identity.png`
- all three carousel frame ids are now absent from `generated_files`

Its library row today renders three broken thumbnails.

---

## 5. The logo choosing flow

- **"Use this logo" blocks for about 18 seconds.** Measured on the demo brand:
  `rederivePrimaryAssets took 17951ms`. It runs inside the server action — reads
  every concept and every SVG back out of R2, re-derives favicon/avatars/OG/
  monochrome, rebuilds the whole ZIP — while the button shows a spinner and the
  page says nothing about what is happening.
- **A failure is invisible.** `server/actions/branding.ts:150-153` catches it and
  `console.warn`s. The choice is saved, the derived assets stay from the previous
  logo, and neither the customer nor support is told. (The comment explains why
  it must not fail the action — correct — but the state it leaves behind is never
  surfaced or retried.)
- **Comparing concepts costs a page load each.** Every thumbnail in the strip is
  a `Link` to `?round=&concept=` — a server round trip to look at the next mark,
  four of them to compare four.
- **The rebuild is incomplete** (§1.2), so after it finishes the brand still
  disagrees with itself.

---

## 6. Why problems of this shape keep shipping

These are not six unrelated bugs. They are five missing structures.

1. **No contract between what the model writes and what the renderer draws.**
   The copy schema is built from `layouts.length`; the layouts decide privately
   whether to use it. Nothing anywhere fails when a line is discarded.
   → Make each layout *declare* its slots (`lead`, `body`, `none`). Derive the
   copy schema from the declared slots of the chosen plan, and make "a layout
   received copy it cannot draw" a type error, not a silent drop.

2. **Nothing looks at the pictures.** `pnpm preview:kit` renders every layout
   from real data for free, and no check ever runs it.
   → A golden-render check over all eight layouts with a fixture brand and
   fixture copy, asserting: the customer's line is present in the DOM, the mark
   is drawn without a destructive filter, no text node is empty, nothing
   overflows the frame. Run it pre-merge, like the e2e suite (GitHub Actions is
   billing-blocked, so this has to be a local gate).

3. **"What derives from the logo" is written down in three places and complete
   in none.** The run, the re-derive, and the kit each know part of the list.
   → One `rebuildFromChosenLogo(projectId)` owning the whole list — favicon,
   avatars, OG, monochrome, SVG pairing, ZIP, **kit posts, site images** — run as
   a queued job with the existing progress UI, not inside a request.

4. **Two different things share one file kind and one delete rule.** Kit posts
   and content frames are both `social_post`.
   → Either scope the delete with `contentItemId IS NULL`, or give content frames
   their own kind. The former is one line and fixes it today.

5. **Half-built features live in the schema.** Version columns imply an edit
   history the product does not have; the price implies five frames the product
   may not draw.
   → Build the versioning (it is what §7 needs anyway) and price the plan that
   will actually be drawn, computed before the hold is taken.

---

## 7. Content Studio, re-studied — the brief

**Mode: Operate.** The visitor is completing a task, not being persuaded. Brand
lives in precision, not decoration. (Impeccable modes; `DESIGN.md` world
unchanged — Room Black ground, Signal Violet fills, Lit Violet accent text,
guest brand colours delegated per the Specimen rule.)

### Job and audience

A returning customer whose brand already exists, on their third visit, who wants
*the next post* — not a tour of the product. `PRODUCT.md` calls this the surface
customers come back to; it is the retention loop, and today it is a form above a
list of rows.

Success: a finished piece, its words on the clipboard and its frames on disk,
without opening anything else, in about a minute.

### The thesis: the plan is visible before the money

One structural change carries the whole redesign. Today the customer types a
brief, presses a button that spends credits, and finds out afterwards what was
made. Instead:

1. **Compose.** Brand, type, brief, tone. The composer states what this brand can
   actually draw — "3 of 5 frames need photography from your social kit" — with a
   link to generate the kit, and prices what will actually be produced.
2. **Plan** (cheap, or included). The model writes the sequence *first* and it is
   shown as an editable storyboard: one card per frame, each with its line and
   the layout it will be set in. Edit a line, reorder, drop a frame, add one.
   Nothing has been drawn yet.
3. **Draw.** Charges for the frames in the plan, then renders them.

This kills three findings at once: the discarded lines (§2.2), the palette-sheet
surprise (§2.1), and the price that describes a different product (§2.3). It also
gives the customer the control they asked for without an "edit the image" feature.

### The piece page

Every item gets its own route — the reason `getContentItem` was written.

- Frames at full size, in order, swipeable; each with the line it carries.
- The caption **in full**, not clamped, with a copy control; hashtags separately,
  because they are pasted separately.
- Download: one frame, or all of them.
- Two actions that already have their database: **edit the words** (writes
  `editedAt`, redraws affected frames) and **regenerate** (writes a new `version`,
  keeps the old one, `isLatest` moves). A customer never loses a version to a
  worse one — which is what the schema comment already promises.

### The library

Stays a list of rows — a grid of cards is ruled out by `DESIGN.md`, and rows scan
better for finding one item among many. Changes: each row links to its piece, the
row's preview is the piece's own first line, drawn types show their frames as
proper thumbnails at a size you can recognise, and a failed row says what it
refunded.

### States and ranges

Zero brands (exists today), zero pieces, one, fifty. Generating — minutes for
drawn types, seconds for written ones. Failed with the refund named. **No kit**:
the composer's most important state, and today it is silent. Arabic throughout,
RTL, with the frames themselves already RTL-aware (`hasArabic` in `layouts.ts`).

### Anti-goals

No scheduling, no publishing integrations, no calendar, no second accent, no card
inside a card, no stat tiles that cannot be measured. Nothing on this surface may
spend credits without showing the price at the control that spends them.

---

## 8. The logo choice, re-studied

- The choice stays instant. Everything derived from it becomes a **queued job**
  with the run's own progress UI — the customer sees "rebuilding your files" and
  can leave the page, instead of an 18-second spinner.
- That job rebuilds the **whole** derived set, posts included, so the brand never
  disagrees with itself.
- A failure is a visible state on the brand with a retry, never a `console.warn`.
- Switching concepts is client state, not navigation. Add a two-up compare — the
  actual job is "which of these two", and it currently costs two page loads.
- Reversed marks: use the monochrome asset or the transparent original on a
  contrasting chip. A destructive filter is only acceptable on a mark that is
  already single-colour, and even then it should be a decision the pipeline
  records, not a CSS side effect.

---

## 9. Order of work

**P0 — wrong or lost output** — shipped, see the branch `carousel-draws-the-brand`

1. ~~Scope the `social_post` delete to kit posts (§4).~~ One predicate,
   `kitPostsOf`, shared by every caller. Covered by `pnpm test:kit-scope`.
2. ~~Stop knocking out the mark (§1.1).~~ `inkLuminance` measures the artwork,
   `markPlate` gives it the brand's paper when it would otherwise vanish, and
   the knockout filter is gone from every layout.
3. ~~Rebuild kit posts when the logo changes (§1.2, §6.3).~~ `brand/logo.changed`
   → `redrawKitPosts`, queued, free, photography reused.
4. ~~Frame plan matches copy slots (§2.1, §2.2).~~ `LAYOUTS[…].copy` is the
   declared contract, `carouselPlan` reads it, and a new `closing` layout gives
   the sequence the frame its own prompt always promised. Covered by
   `pnpm test:layouts`. The composer now says what a carousel will draw before
   it charges — a brand with no kit gets two frames, and is told so.

**P1 — the customer's control**

5. Piece page: full caption, copy, download, full-size frames (§3).
6. Edit and regenerate on the columns that already exist (§3).
7. Choose-logo becomes a queued rebuild with visible failure (§5).

**P2 — honesty and prevention**

8. Price the plan that will be drawn (§2.3).
9. Golden-render check over every layout (§6.2).
10. Layout selection driven by the brief, not by availability order (§2.5).
