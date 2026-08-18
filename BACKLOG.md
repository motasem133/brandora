# Backlog

Everything known-outstanding, in the order to do it. Fixes first — nothing in
Improvements starts until Fixes is empty.

A **fix** is something wrong, broken, or owed to a customer. An **improvement**
is something that works and could be better. The split is deliberate: the
research memo (`Brandora-improvements.pdf`) is full of good ideas that would all
have been built on top of a product that was quietly losing customers' money.

Times are working estimates, not commitments. Where one is uncertain it says so.

*Last true on 18 August 2026.*

---

## Fixes

**Empty**, and it has stayed empty since 13 August. The CI suite
that had been red for days is green again — three causes, one of them a real
defect: choosing a logo failed *after* it had worked, because the derived assets
were rebuilt inline and unguarded, so a customer saw an error for something that
had succeeded.

One more of the same shape was found on 15 August and fixed the same day: two
tests had a three-item string typed into them and were only ever green because
of what happened to be in one machine's `.env`. `sectionsForProject` drops
`logos` where logo generation is unavailable, so CI was correctly reading a
two-item sentence at a different price and being told it was wrong.

Ten older fixes are closed — eight shipped on 10 August, one died when the
customer deleted the project it was about, and one was found on 12 August while
testing something else: a save that wrote to the database and painted nothing.
What they were, and what they turned out to be, is at the end of this file.

---

## Improvements

### 1. Turn on yearly billing — half a day

Columns, interval enum and Polar product fields all exist; both yearly prices
are zero, so the option never appears. Cash up front and lower churn, and no new
feature to build.

**Needs from you:** yearly prices in USD and AED for both plans, and a Polar
product for each. Nothing can start without the prices — they are public
numbers and not ours to invent.

### 2. Reprice the social kit — 20 min

At 4 credits it returns 47% on Creator and **28% on Studio** — the least
profitable thing we sell, and the thing the product most wants people to use. At
6 it is ~52% on Studio and still the cheapest way to get eight designed posts
anywhere.

Written and tested; held as a draft (#19) on purpose. Two complete kits exist
across nine projects ever, so this currently protects a margin nobody is
spending against. The funnel has been recording since 11 August; a fortnight of
it settles the question either way.

**Needs from you:** the decision, once there is data. It is a public price.

### 3. A real render, not a drawing, of the site a free customer is missing — 1–2 days

Shipped on 12 August, drawn rather than described: both sections render the
thing in the customer's own palette, faces and mark. What is left is the step
past a drawing — a real render of the site their brand would actually produce —
which is a design decision before it is code, and worth having the funnel's
answer on the drawing first. Cheaper than it was on 12 August: the site is now
photographic, sized per brand and rendered from stored blocks, so what a free
customer is missing can be shown by rendering it rather than by drawing it.

---

## In review

**#19**, the social kit reprice, held as a draft on purpose — see Improvement 2.
Nothing else is outstanding.

---

## Yours, not code

Mostly small and recurring costs while they are left. One is not: the Arabic
exemplar is a standing claim the landing page cannot currently back. The
wildcard DNS record was the other until 18 August; it is closed below.

### Vercel–Inngest integration — connected 18 August

So syncs happen on deploy rather than by hand. This was blocked on Fix 1 — on a
shared app id it made things worse by syncing every preview over production —
and Fix 1 shipped on 10 August. `APP_ID` in `src/server/inngest/client.ts` is
now per-environment (`brandora` in production, `brandora-preview`, and
`brandora-development` locally), so a preview can no longer take production's
registration.

Connected from **Inngest's dashboard**, not from Vercel, and the distinction
matters. `vercel integration add inngest` installs the marketplace product
`inngest/account`, which provisions a *new* Inngest account through Vercel
billing and overwrites `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` to point at
it — orphaning the `brandora` app and its run history, and cutting off anything
in flight. There is no connect-my-existing-account flag. Connecting from inside
Inngest keeps the account, the app id and the keys, which were left untouched.

Not verifiable from the Vercel CLI: classic OAuth integrations do not appear in
`vercel integration installations`, which lists marketplace installations only.
The check is Inngest's own Apps page — `brandora`, last synced, and whether the
source reads Vercel rather than manual.

All previews still register as the same `brandora-preview` app, so they
overwrite each other. That is harmless for production and worth knowing before
someone debugs two previews disagreeing.

### Neon preview branches — 5 minutes, recurring

The free plan caps the project at ten branches and the Vercel integration mints
one per preview deployment. Past the cap no `DATABASE_URL` is injected and the
preview build dies with `Invalid environment variables`, which reads like a code
failure and is not. Neon's own cleanup runs slower than a working day's merges,
so this needs clearing every so often. Deleting the `preview/*` branches of
merged PRs fixes it immediately.

Two open pull requests as of 16 August: #19, which has been a draft since
10 August, and #57. Nine have merged since this paragraph was written — #33 and
#49 through #56 — so nine preview branches are eligible for collection. Worth a
look before the next batch of previews rather than after one fails to build.

### What the DNS move left to check — 5 minutes, and one date

The wildcard is closed (44 below), but two things it touched are not provable
from DNS alone.

**Send a real email, both directions.** One to `hello@enigmitic.com` and one out
of Brandora — a password reset will do. Every record was verified answering
identically from Vercel's nameservers before and after the switch, but records
existing is not mail arriving, and no machine on this end can test SMTP.

**6 October.** Hostinger renews the Enigmitic site's Let's Encrypt certificate
around then, over an HTTP challenge against the apex. That still works — the
apex ALIAS still resolves to Hostinger, and Vercel's default CAA records permit
`letsencrypt.org` — but it is the one part of the move that will not be
exercised until it happens. A certificate warning on `enigmitic.com` near that
date starts here.

### Preview deployments ran against the retired database — repointed 18 August

**Fixed on 18 August**: the Neon–Vercel integration was disconnected from the
old project and connected to `wandering-grass-71856823`. What follows is what it
cost while it was wrong, because the shape of it is worth keeping.

The integration had pointed at the **old `us-east-2` project**, and it was not a
suspicion by the end. Three preview branches were observed being created there —
PRs #60, #67 and #68 — while the current production project received none.

What previews therefore get is a branch of a database frozen on 5 August:

| | current production | what previews branch from |
|---|---|---|
| tables | 25 | 23 |
| migrations | 19, latest 14 Aug | 13, latest 8 Aug |

Six migrations and two tables behind, and Vercel never migrates, so nothing
closes the gap at deploy time. The two missing tables are `site_messages`,
which backs `src/app/sites/[subdomain]/contact/submit/route.ts`, and
`project_emails`, which backs the brand-nudge job. So the contact form test
below, run against a preview URL, fails on a missing table and reads exactly
like a code defect. CI is unaffected — it brings its own database — which is
why this has stayed invisible.

The fix was in the **Neon console**, not Vercel. Neither `neonctl` nor
`vercel integration` exposes the binding — `/projects/{id}/integrations` is not
in Neon's public API and `vercel integration list brandora` reports no
marketplace resource — so it is Neon's own integration and a browser is the only
way in. Worth knowing if it ever drifts again.

Then the rest of this item, which has not changed: the old project can be
deleted once nobody wants the rollback, and the database password has been
through a chat transcript and is worth rotating.

**Preview branches themselves are no longer piling up.** Nine were listed as
eligible for collection; Neon's own cleanup has taken them. As of 18 August the
old project holds `production` and `vercel-dev`, the current one holds
`production` alone — two and one against a cap of ten. `preview/wildcard-dns-done`
was deleted by hand after #67 merged.

### The Google sign-in client — done, but write it down

Created 12 August, and the button on the sign-in and sign-up screens depends on
it entirely: `hasGoogle` in `server/auth.ts` is true only when both
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set, and the forms hide the
control when it is false — a button offering a provider that is not registered
is a control that fails when it is pressed. Both variables were empty
everywhere, including `.env.deploy`, which is why the button had never appeared
on any environment.

They are now set in Vercel for production, preview and development. Two things
are worth knowing before anyone debugs this again:

- **The redirect URI is fixed by where Better Auth is mounted** —
  `https://brandora.enigmitic.com/api/auth/callback/google`, plus
  `http://localhost:3000/api/auth/callback/google` for local work. One wrong
  character produces a button that renders perfectly and dies at Google.
- **The consent screen must be published.** In *Testing* only listed test users
  can sign in and everyone else is blocked. Publishing is instant for the
  `openid`/`email`/`profile` scopes this asks for — no Google review.

**Rotated 12 August**, and the reason is worth keeping: the first secret passed
through a chat transcript on the way in. So did the second, which is the part
that matters — a rotation is only a rotation if the new value never travels the
way the old one did. Google lets a client hold two secrets at once, so the
durable version is to add one in the console, paste it straight into Vercel's
own settings, redeploy, and then delete the old one. Nothing needs to see it in
between. Same reasoning as the database password below.

### The Arabic the landing page cannot prove — a run, and a decision

Arabic is the sharpest differentiator the product has, and the brand the page
shows in full does not exercise it. Sultana was briefed in English and all four
of its marks are Latin, so the Arabic section can only demonstrate that a brief
is *displayed* right-to-left — which every internationalised site does, and
which proves nothing about generated Arabic.

Nothing in code fixes this honestly. It needs a real run from an Arabic brief,
kept as the page's exemplar the way Sultana is now: the files, the marks and the
copy all coming out of one generation. That costs credits and it is a decision
about what the product shows itself doing, which is why it is here rather than
in Improvements.

The seven findings around it are in #57. This is the one left, and it was left
deliberately — the alternative was mocking up Arabic marks on the page that
sells generated ones.

### The contact form, once — 2 minutes

Send a message through a real published site and check two things: the email
arrives, and pressing reply answers the visitor rather than Brandora. It was
verified end to end locally, but only against a fake `@brandora.local` address —
real deliverability through Resend is the one part untested.

Do this on **production**, not on a preview URL. `site_messages` does not exist
in the database previews branch from — see *Preview deployments run against the
retired database* above.

---

## Watch, do not build

### A free signup costs about 15 cents

Of model spend, granted at sign-up — not on confirmation, which is where this
file used to say it happened. Since 12 August an unconfirmed address can spend
that grant on one run and nothing more, so fifteen cents is now what an
abandoned or fake signup can actually cost rather than a ceiling nobody could
reach. The grant is written once per organization and only a payment adds to
it, so the ceiling holds however many times the run is retried.

Confirmation was never much of a defence — a disposable-address service defeats
it for the price of nothing — and it is worth watching in the ledger before it
is worth engineering against. What to watch: unverified organizations with a
delivered run, in the funnel table.

### The contact endpoint has no rate limit

Deliberately, for now. The messages land in a customer's inbox rather than ours,
so the thing to watch is not spam volume but **sending reputation**: the
endpoint posts to Resend from our domain on an unauthenticated request. The
first sign of abuse will be a deliverability problem, not a full inbox. The
`rate_limits` table is already in the schema when it is wanted, and the route
says where the limit goes.

### The image model stays as it is

Seedream 5.0 Pro at ~$0.0675 an image, decided on 10 August against Nano Banana
Pro at $0.15. fal's own benchmarks put Seedream ahead for marketing and
e-commerce, which is what this sells; at 2.2× the price it is not a clear
quality win. If it is ever revisited: `FAL_IMAGE_MODEL` is read by one function
serving **both** logos and kit photography, so it cannot upgrade logos alone,
and a three-scene kit at $0.15 an image loses money on every plan.
`COST_PER_IMAGE` is hardcoded beside it and would have to move too.

---

## Closed

### Fixes, 10 August

1. **Inngest app id** — production, previews and local dev all presented as the
   same app, and the last registration owned the URL. That is the 9 August
   incident. Production keeps `brandora`; everything else is `brandora-<env>`.
2. **`CRON_SECRET`** — set, and verified returning 401.
3. **Regenerate `f27ba257`** — dead. The customer deleted the project.
4. **The two zero costs** — the assistant now writes through `recordUsage`;
   vectorising is a cent an image, from a real fal invoice. Every margin the
   admin screens report is now a real number rather than a ceiling.
5. **No-markup rule on website blocks** — the regex moved to `lib/blocks` so
   the website and social contracts cannot disagree about what a tag is.
6. **Ad copy truncating** — 60 was the length of a good headline, so the model
   wrote to it and stopped mid-sentence. Eighty, plus a ceiling-not-target rule.
7. **`tabs.spec.ts:43`** — not flaky and not timing. `BrandPicker` returns null
   below two brands and the fixture account had one, so the control the test
   asserted on was never on the page in CI. The fixtures grew a second brand,
   which also made the assertion mean something for the first time.
8. **Support view** — Content Studio library added, and the list shows the same
   name as the page behind it. The written brand and palette followed on
   10 August, after a customer's story and colours turned out to be invisible
   there.
9. **Impeccable waivers** — both scoped to their own file, with reasons.

### Fixes, 12 August

10. **A saved edit painted nothing** — a customer changed their slogan, the row
    was written, and all four places the page shows it kept the old words for
    at least thirty seconds. Two times in three, and it had been live since the
    content library shipped. `router.refresh()` runs inside a React transition,
    and a Suspense boundary that re-suspends inside a transition blocks the
    whole thing from committing — so the correct payload arrived and was never
    painted. The boundary was buying the wait on one indexed query, measured at
    1–22ms. Four `window.location.reload()` calls elsewhere in the codebase had
    been written against this same fault without naming it — a run landing a
    section, a run finishing, choosing a logo, and a piece of content finishing
    in the Studio. All four are refreshes again as of the same day, each proved
    by a browser test that asserts both what the page shows and that
    `beforeunload` never fired. The fifth, starting a social kit, is converted
    on the same reasoning but is the one that could not be exercised: running it
    for real spends four credits and three generated photographs.

### Improvements, 10–12 August

1. **Track the funnel** — five endings for six events that were all beginnings.
   Recording since 10 August.
2. **Move the database to `us-east-1`** — a new Neon project and a
   dump/restore, verified table by table. Every query was crossing regions.
3. **Cache published customer sites** — the query rather than the page. Found
   and fixed an invalidation gap on custom domains while doing it. (The pages
   have their own URLs since 13 August; the query is still the right thing to
   cache, now because four pages would otherwise hold four copies of one row.)
4. **Let people edit their own brand copy** — the assistant's own bounds,
   shared, so a person and a model are held to one contract.
5. **A working contact form** — emailed to the owner with reply-to the visitor,
   and kept, because email is the delivery and the row is the record.
6. **Carousels and stories in Content Studio** — one of seven declared types
   generated; three do now, and two of them produce finished artwork.
7. **Logos revealed as they land** — the step announced nothing until
   vectorising and the derived files were done, over pictures that existed.
   The *faster tier* half was declined; see above.
8. **An admin screen for credit grants** — `adjustCredits` had been wired to
   nothing, and two grants had been typed against production by hand.
Shipped 12 August, all four from the growth memo:

9. **The verification gate moved after the first run** — a new account
   generates once without confirming its address, and the gate falls on the
   second. `mustVerifyEmail` is the one place that decides it, for the brand
   run, Content Studio and every control that has to say so before it is
   pressed; a first run that failed and was refunded does not count as the run.
   Of nine accounts, all seven that confirmed ran a generation within eight
   minutes and neither unverified one ever spent a credit or was told why.
10. **A route to billing on the credits wall** — three of the four walls
    already pointed at billing. The generation panel, the one a returning
    customer actually meets, named the problem and offered nothing.
11. **A free customer is shown the site and kit they did not get** — named on
    the project page with the plan they need, and drawn in their own palette,
    faces and mark rather than described. The kit's locked line also quoted the
    wrong plan at the wrong price: "Pro and above" for something Creator
    includes.
12. **Ad copy in Content Studio** — `ad` was one of four declared types that
    generated nothing, while every social kit wrote a headline and a body once,
    at brand-generation time, with no way to ask for another. It generates now,
    at one credit, in the customer's brand voice. Four fields rather than a
    caption, because that is what an ad manager asks for and a blob has to be
    pulled apart by hand. The written types also open in the library with a copy
    control on every part — a caption set used to show two clamped lines and no
    way to reach the rest, which made the copy technically generated and
    practically undelivered.
13. **Kit photography told apart from social copy** — `ai_usage.feature` had
    one value for both, so captions costing a fraction of a cent and
    photographs costing seven shared a row. On production it was $1.0125 of
    photography against $0.0104 of captions, filed as one feature: `social`
    read as costing a hundred times what it does, and the kit — the second most
    expensive thing a run makes — had nowhere to appear at all. There is a
    `kit` value now, backfilled by the migration that adds it, which replaces
    the enum type rather than extending it because Postgres will not use a
    value added in the same transaction. The *image share* figure was reading
    `logo` alone while it was at it — wrong since vectorising shipped — and
    sums everything that draws now.
### The website, 13 August

The generated site had never had a design pass, and it is the most public thing
this product makes. Seven changes, in the order they mattered:

13. **A customer's own pictures on their own site** — the logo, favicon, share
    card and kit photography had been in storage the whole time with no way to
    serve them: `/api/files` needs a session and sells SVG export by plan.
    `/api/site-image` authorises through a join instead — published site, kind on
    an allowlist — so the bucket stays private and kit archives stay unreachable.
    Images resolve by kind at render, which makes a site become photographic the
    day its owner buys a kit, with no regeneration and no credits.
14. **Every page got its own address** — four pages shared one URL, so `/about`
    404'd and search saw one page. `?page=` redirects rather than breaking. The
    contact form's endpoint moved to `/contact/submit` to stay out of the way of
    the contact page.
15. **The button became a button** — `cta` was a `<span>` on every site ever
    published; the primary conversion element could not be clicked. `ctaHref` is
    validated against the four link forms a small business uses, and refuses
    `javascript:`.
16. **Blocks worth having** — the brand's own line, questions, opening hours. No
    testimonials block and no stats block: both invite a model to invent a person
    or a number on a real business's site. New blocks arrive empty, because
    sample copy in a canvas is indistinguishable from finished copy — which is
    how "Tell the story in a few short paragraphs" got published.
17. **One brand, one bearing** — four registers, the same judgement the kit
    makes from the same two fields, deciding scale, rhythm, radius, measure, nav
    formality and whether photography is duotoned. Two businesses no longer get
    the same site with two palettes.
18. **Pages generated for the business** — a café gets a menu, a consultancy
    gets pricing. The copy contract had no minimum lengths and no descriptions at
    all, and `contact.email` was free text: "email us" validated as an address.
    Six real generations went into the shape of it, and most of what they taught
    was what *not* to enforce — every structural rule refused as a schema error
    cost a whole generation, so arrangement is corrected in code now.
19. **The builder stopped lying** — a failed save said "Unsaved changes" forever
    and the work went with the next reload; a plain member saw Publish and got
    "Insufficient permissions." after confirming; list items could be edited but
    never added or removed. Publishing had no tests at all and has five now.
20. **A sitemap and a robots.txt** — worth having only now the pages have
    addresses. Both are the exception to the proxy matcher's file-extension rule,
    which is pinned by `test:proxy`, because unmatched they serve Brandora's own
    files under a customer's domain.

Two defects the deploy itself found, both fixed the same day: a fixture seed
still writing the dropped `template` column, and `?page=` serving the home page
in production because a search param may not share a name with the dynamic
segment above it. `next dev` redirected correctly, which is why it got that far.

### The editor, 13 August

The client, on the editor: *"still hard to understand or to deal with it, we
are not dealing with developers."* Audited against Nielsen's heuristics and
WCAG, designed before it was written, then built in seven stages.

21. **Editing stopped publishing.** On a live site every keystroke was public
    within a second and a half, half-typed, and nothing said so. `pages` is the
    working copy now; two new columns hold what visitors get, copied across in
    the statement that publishes. The top bar names the pages that are waiting,
    the panel lists what will change before it changes, and "Go back to what's
    online" undoes an afternoon.
22. **The preview stopped lying, twice more** — no photographs and no
    alternating grounds in the canvas while production had both. Third drift in
    that pair, so the allocation rule and the image lookup are shared code now.
23. **The vocabulary is a shop's, not a CMS's** — "Top of the page", "What you
    offer", "Questions and answers"; and a day and its hours stopped both being
    called "Title" and "Body text".
24. **Six things the editor kept to itself**: deleting asks, undo stops
    pretending, the section says "Edit", the right column never opens empty, an
    empty page says it has left the menu, and three sentences at the top say
    what the screen is.
25. **Forms ask answerable questions** — fields come from the schema, so a
    phone number, a price and the button link stop being invisible; "where the
    button goes" is a question rather than a request for `mailto:` syntax.
26. **Pictures can be chosen**, and a café can call its menu page a Menu.
27. **The site itself lays out** — a heading beside its prose rather than one
    column pinned hard left, one call to action rather than two shouting bands,
    a header that acts and a footer that ends the page, and one left edge from
    top to bottom.

### Also fixed on the way, not on any list

- **The app bar printed itself over itself** below ~1400px for administrators.
  Centred with `position: absolute`, so it could not push the credits pill —
  only be painted across it.
- **Web Analytics recorded nothing** because `/_vercel` was missing from the
  proxy matcher. The beacon path has no dot, so it was locale-redirected and
  dropped. Not "two installations colliding".
- **`hashtag` used `.regex()` with Unicode escapes**, which zod serialises into
  the JSON schema sent to the provider. Qwen — primary model for every social
  task — refuses the request outright, and it surfaces as "response did not
  match schema", blaming the model for something it never wrote.
- **`settings.spec.ts`** waited 15 seconds for a save that crosses regions.

### The two ends of a run, 14–15 August

28. **The moment a run finishes** — the completion note named what had arrived
    and stopped. It is a summary now: the brand, its mark and its palette, then
    what the run produced, and for a plan that cannot have them the website, the
    designed kit and the vector files drawn *in the brand generated ninety
    seconds ago*. That is the one place the product's actual claim — that
    everything agrees with everything — can be made without asking anyone to
    take it on faith. Not a gate: no modal, no scrim, dismissible, nothing
    withheld below it. It reuses the `justFinished` transition rather than adding
    a second way to ask "did a run just finish here", so arriving at a brand
    generated last week shows nothing and the freelancer on their tenth run is
    not congratulated ten times a day.
29. **The moment they rename** — the documented limit is that renaming renames
    the record, not the work, and that is now said where it applies, with the
    fork: save the name, or also pay to redraw what carried it. `branding` is
    excluded from the paid re-run deliberately, being the section that produces
    the name ideas. The warning is assembled by `Intl.ListFormat` from the
    sections the project actually has, so a free brand is not told its website is
    stale and Arabic gets its own conjunction. Both routes to a new name go
    through one guard; they called the action independently, so a warning on one
    would simply not have existed on the other.
30. **The two-day reminder, written and then switched on** — one email per
    project, ever, to someone whose brand has sat unfinished for 48 hours and
    who has not bought a plan. It shipped deliberately *unregistered* on
    14 August, because the moment it is in the Inngest list it starts mailing
    real customers and an email is the one thing here that cannot be taken back;
    it went on once the copy was approved and the rule agreed. "Has not returned"
    means having done something with the brand rather than having opened the
    page — nothing records a page view and adding one would put a write on every
    load of the project page — so someone who looked and did nothing is counted
    as absent. That is the call, and the code now says so. A 14-day ceiling stops
    the first pass mailing months of backlog in one morning.
31. **The favicon is cut from the icon, not the wordmark** — and then narrowed
    the same week. Surveying production before backfilling found the flaw: the
    rule was "swap unless the chosen concept is the icon", which under two logo
    styles is the same sentence as "swap the wordmark" and stops being so the
    moment a third exists. Three live brands had chosen a `lettermark monogram`
    or an `emblem badge` — styles from before `LOGO_STYLES` narrowed — and both
    already shrink cleanly, so the rule would have replaced a mark the customer
    deliberately chose on the favicon of a published site. It is
    `isWordmarkStyle` now, and the backfill set dropped from five brands to two.

### The landing page, 15 August

The most public thing the product has, rebuilt as **Direction E — "The Run"**:
a dark hero where a real generation replays, handing over to Sultana's own cream
paper for what it produced, then back to the dark for the price.

32. **The page became the run** — the previous direction's above-the-fold proof
    was a screenshot of the dashboard, so the first image a visitor got from a
    brand generator was an admin UI, with the actual output two thousand pixels
    down. The light region works through `.world-light`, which re-points the
    chrome tokens at the `--guest-*` variables `lib/brand-theme.ts` emits, so
    every existing utility resolves to the guest brand's ink without any
    component knowing.
33. **It was designed at 1440 and it showed.** The replay — the page's only
    demonstration — started on mount, and on a 390×844 phone the panel sat 626px
    down, so all nine seconds played out below the fold and the visitor scrolled
    to a finished still. An IntersectionObserver owns it now. Touch targets
    across the footer, the FAQ rows and the header nav measured 15–20px, under
    WCAG 2.2's 24px floor; below `lg` there was no way through 11,000px of page,
    so the dash rail becomes a bar along the bottom where a thumb already is.
34. **Arabic got its own face back** — 451 glyphs on `/ar` were rendering in
    Arial. The cause was not the two type utilities anyone reaches for first:
    `var(--font-jakarta)` expands to include next/font's metric-adjusted
    fallback, declared `local("Arial")`, and Arial covers Arabic — so the
    fallback that exists to protect CLS was swallowing the script. `[dir='rtl']`
    re-points `--font-display` and `--font-sans` instead. One declaration, every
    consumer; `--font-mono` stays Latin on purpose, its content being hex codes,
    paths and a clock.
35. **Bidi stopped corrupting every machine-written value** — `#1B3A3A` rendered
    as `1B3A3A#` and `/home` as `home/`, both wrong in the worst way, a hex being
    something a customer copies and a route something they type. A
    `machine-value` utility isolates the run. The panel's timeline also stopped
    hardcoding five steps against an array that arrives from `messages/*.json`,
    and the pricing grid stopped assuming exactly three plan rows — an admin
    screen can edit that table, and zero rows rendered an empty grid under an
    assurance still promising a free tier.

### The open critique findings, 16 August

Seven of the eight the two critiques had left open — everything in them that was
a change rather than a decision. The eighth is the Arabic exemplar, above under
*Yours, not code*.

36. **"Two logo concepts" labelled four marks** — reading the files settles it:
    `wordmark` is one concept, `icon` is a second, `symbol` is that second one
    with its name removed and `name` is the wordmark both share. So two concepts
    and four lockups, with each tile named — which matters because the count was
    the first thing on that section a visitor could check and it did not survive
    checking. The names are the alt text too; four images all reading "a logo
    concept generated by Brandora" said nothing about how they differ.
37. **One screenshot sat beside all five process steps**, captioned "The first of
    eight questions", so it contradicted four of them and left ~300px of dead
    column beside the last two. The panel changes with the step now. Every
    artifact is real or visibly a diagram: one screenshot exists in this repo and
    it belongs to the brief, so it stays the only one used.
38. **"Run" was used four times above the fold and never defined** — the deck
    defines it now. Arabic had a second problem underneath: `howShot` said الجولة
    where every other string says التشغيل.
39. **A token nobody imported** — `Eyebrow` existed and its exact string was
    hand-rolled in ten more places. It lost to a copied string because it
    rendered only a `<p>` while six of those sites are a real section's heading.
    The element is a prop now, and every site adopted it keeping its own element,
    so nothing moved on screen.
40. **Ninety seconds of silence** — the generation panel reported progress in
    colour and motion only, so a screen reader could not tell a run in progress
    from a run that had died, on the screen this product is sold on. A polite
    live region narrates the step, the failure and the end, announcing per step
    rather than per payload.
41. **A heading level skipped wherever brands are listed** — `BrandSpecimen`
    wrote an `<h3>` directly under the page `<h1>`. The other half of that
    finding was `ProjectCard`, which had **no consumers at all** and was deleted.
42. **The projects list had no way through it but reading every card** — search
    and three sorts, in the URL, as a GET form and a row of links, which is what
    the admin screens already do. Writing the test found two faults worth having:
    both search and "by name" worked on `title` while the card's heading is
    `businessName || title`, so a brand's own name as displayed found nothing and
    the sort could not be checked against the screen.

### 17 August

43. **The Agency plan is gone, both halves of it.** It had sat at $99 with
    `is_active = false` since the ladder was renamed — unbuyable, invisible, and
    still a row every plan query stepped around plus a live product in the
    production Polar catalogue. Deleted rather than finished: nobody could say
    what it would include that Studio does not. Checked before removing it —
    zero subscriptions pointed at it, and `subscriptions.plan_id` is the only
    foreign key into `plans`, on `NO ACTION`, so the delete could not have
    cascaded. The Polar product is archived rather than destroyed, which is all
    Polar offers and is reversible from the dashboard. `plans` now holds exactly
    the three plans we sell.

### 18 August

44. **Customer subdomains resolve, and it was never a five-minute DNS record.**
    `*.brandora.enigmitic.com` now answers, holds a Let's Encrypt wildcard
    certificate that auto-renews, and returns
    `x-matched-path: /sites/[subdomain]/[[...path]]` — the proxy rewrite running
    on a customer host. Every published site had been reachable only at
    `brandora.enigmitic.com/sites/{subdomain}` while the builder handed the
    customer the subdomain address.

    The estimate here said one CNAME. It could not have worked: a wildcard
    certificate needs a DNS-01 challenge, so Vercel would only issue one if it
    controlled the zone, and the dashboard offered nameservers and no record.
    Two cheaper routes were rejected — issuing by hand with
    `vercel certs issue --challenge-only`, which needs redoing every ~90 days
    and darkens every customer site if missed, and registering each subdomain
    through the Vercel API on publish, which is a code change rather than a DNS
    one. So the whole `enigmitic.com` zone moved to Vercel DNS. The nameservers
    are changed at **GoDaddy**, which is the registrar; Hostinger only ran the
    DNS.

    Three things made it survivable and would matter again. The apex A records
    **rotate** — TTL 60, four distinct IP pairs inside an hour — so the apex is
    an ALIAS to `enigmitic.com.cdn.hstgr.net` and never copied A records. The
    zone carries company email and every email Brandora sends, so all fourteen
    were recreated and verified answering from Vercel's nameservers *before* the
    switch, not after. And Vercel does not create `*.brandora` for
    you: the zone's default wildcard sits at the apex, and DNS's
    closest-encloser rule stops it applying below the `brandora` node, so
    subdomains returned NXDOMAIN until an explicit record was added.

    Verified 14 records against `ns1.vercel-dns.com` before the switch and 14
    publicly after, fetching the Enigmitic homepage each time to prove the apex
    still served Hostinger's site rather than Vercel's edge. What is left to
    check is above, under *Yours, not code*.
