# Backlog

Everything known-outstanding, in the order to do it. Fixes first — nothing in
Improvements starts until Fixes is empty.

A **fix** is something wrong, broken, or owed to a customer. An **improvement**
is something that works and could be better. The split is deliberate: the
research memo (`Brandora-improvements.pdf`) is full of good ideas that would all
have been built on top of a product that was quietly losing customers' money.

Times are working estimates, not commitments. Where one is uncertain it says so.

*Last true on 12 August 2026.*

---

## Fixes

**Empty.** Ten are closed — eight shipped on 10 August, one died when the
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

### 3. Finish or delete the Agency plan — a day, or ten minutes

A fourth plan sits in `plans` at $99 with a Polar product already created and
`is_active = false`, so it can be neither bought nor seen. It is either a plan
or it is not, and while it is neither it is a row that every plan query has to
step around and a product in Polar nobody is watching.

**Needs from you:** which one. Deleting it is ten minutes. Making it real is a
day, and needs to answer what it includes that Studio does not.

### 4. A real render, not a drawing, of the site a free customer is missing — 1–2 days

Shipped on 12 August, drawn rather than described: both sections render the
thing in the customer's own palette, faces and mark. What is left is the step
past a drawing — a real render of the site their brand would actually produce —
which is a design decision before it is code, and worth having the funnel's
answer on the drawing first.

---

## In review

**#19**, the social kit reprice, held as a draft on purpose — see Improvement 2.
Nothing else is outstanding.

---

## Yours, not code

None of these are urgent; all of them cost something small and recurring while
they are left.

### Vercel–Inngest integration — 10 minutes

So syncs happen on deploy rather than by hand. This was blocked on Fix 1 — on a
shared app id it made things worse by syncing every preview over production —
and Fix 1 shipped on 10 August, so it is now safe.

### Neon preview branches — 5 minutes, recurring

The free plan caps the project at ten branches and the Vercel integration mints
one per preview deployment. Past the cap no `DATABASE_URL` is injected and the
preview build dies with `Invalid environment variables`, which reads like a code
failure and is not. Neon's own cleanup runs slower than a working day's merges,
so this needs clearing every so often. Deleting the `preview/*` branches of
merged PRs fixes it immediately.

Two open pull requests as of 12 August: #19 and #33. Four merged on 12 August
with their branches deleted, which frees their preview branches — Neon's own
cleanup is slower than a working day's merges, so it is worth checking that
those four are actually gone.

### After the database move — whenever

The old `us-east-2` Neon project is still there as a rollback and can be deleted
once nobody wants it. The database password has been through a chat transcript
and is worth rotating. The Neon–Vercel integration still points at the old
project, so preview branches are made in the wrong place.

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

### The contact form, once — 2 minutes

Send a message through a real published site and check two things: the email
arrives, and pressing reply answers the visitor rather than Brandora. It was
verified end to end locally, but only against a fake `@brandora.local` address —
real deliverability through Resend is the one part untested.

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
3. **Cache published customer sites** — the query rather than the page, which
   cannot be cached because it reads `?page=`. Found and fixed an invalidation
   gap on custom domains while doing it.
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
