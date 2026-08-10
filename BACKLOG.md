# Backlog

Everything known-outstanding, in the order to do it. Fixes first — nothing in
Improvements starts until Fixes is empty.

A **fix** is something wrong, broken, or owed to a customer. An **improvement**
is something that works and could be better. The split is deliberate: the
research memo (`Brandora-improvements.pdf`) is full of good ideas that would all
have been built on top of a product that was quietly losing customers' money.

Times are working estimates, not commitments. Where one is uncertain it says so.

---

## Fixes

### 1. Scope the Inngest app id — 20 min

`client.ts` declares `new Inngest({ id: 'brandora' })` with no environment in
it, so production and every preview present the same app. Inngest keys an app by
its id, so whichever deployment registers last owns the URL: a preview can take
production's registration and answer its events. That is exactly the 9 August
incident, where two customers' runs were never collected and their credits sat
held.

Production keeps `brandora` so the existing app is not orphaned; anything else
becomes `brandora-<env>`.

**Needs from you:** nothing.

### 2. Set `CRON_SECRET` — 2 minutes, yours

`/api/cron/release-holds` is public. It is idempotent and only ever returns
money that is owed, so the exposure is small, but anyone can trigger a sweep.
The route already reads the variable; it just is not set.

**Needs from you:** add it in Vercel. Nothing to deploy.

### 3. Regenerate `f27ba257`'s social copy — 15 min

Human Optimization Framework (`svsomos@gmail.com`) still has the broken set:
empty bio, `test` as all ten hashtags, empty ad headline, `<br>` through all
nine captions. The contract that lets that through is fixed, but the fix does
not rewrite what is already stored — and this customer has an email from us
saying their brand is ready.

One credit, granted as goodwill the same way the recovery run was.

**Needs from you:** a go-ahead, since it writes to a customer's project.

### 4. The two costs that record as zero — 15 min, plus a number

`COST_PER_VECTORIZE = 0` and the assistant writing `costUsd: '0'` mean every
margin figure in the product is a ceiling, and the admin screen that names
customers costing more than they pay under-reports them. The assistant is a
one-line fix — `estimateCost` already knows that model's price.

**Needs from you:** the per-image vectorise price from a fal invoice. I cannot
know what they charged.

### 5. No-markup rule on website blocks — 30 min

The same `glm-5.2` that wrote `<br>` into nine Instagram captions is the
*primary* model for website copy, and the block contract has no rule against
markup. Nothing stored is affected today — all four projects check clean — but
the exposure is identical and the fix is the shape already used in
`socialSchema`.

**Needs from you:** nothing.

### 6. Ad copy truncating mid-sentence — 30 min

One project's ad headline is "Stop eating sad, thin snacks! We are Chunky, and
we are here" — 60 characters, which is exactly the maximum. The model writes to
the limit rather than to the sentence. Room plus an instruction to finish the
thought.

**Needs from you:** nothing.

### 7. `tabs.spec.ts:43` — 1–2 hours, uncertain

Red on `main` since before 9 August. Four PRs were merged that day with CI red,
and each time the failure had to be checked by hand to confirm it was not the
new one. A suite that is always red cannot tell anyone whether a deploy is safe.

It passes locally every run and fails only in CI, so this is a seed-data or
timing difference. It could resolve in twenty minutes or take an afternoon.

**Needs from you:** nothing.

### 8. Finish the support view — 45 min

Two gaps in what shipped:

- The Content Studio library is missing, so the screen is not quite everything
  the customer sees.
- The list shows the project *title* while the page is headed with the generated
  *business name*, so a row can look like a different project from the one it
  opens.

**Needs from you:** nothing.

### 9. Impeccable waivers — 1 minute

`templates.ts` trips the radius, font-size and colour rules on every edit, and
`globals.css` trips it on the inner-radius idiom `calc(var(--radius-card) -
1px)`. Both are correct: email HTML cannot reference CSS variables, so the
design system is hand-inlined there. Fourteen findings fire on every touch,
which is how a real finding gets missed.

**Needs from you:** confirmation. A rule is never silenced without it.

---

## Improvements

Ordered so that the thing which makes the others decidable comes first.

### 1. Track the funnel — 2 hours

Six events exist. There are no onboarding step events across eight steps,
nothing for checkout completed, nothing for credits exhausted, nothing for
content generated. `checkout_started` fires and then silence.

Everything below this line — what to price, what to build, what to cut — is
currently argued from the product's shape rather than from data. That is why it
is first.

**Needs from you:** confirm `NEXT_PUBLIC_POSTHOG_KEY` is set in production, or
the events go nowhere.

### 2. Move the database to `us-east-1` — 1 hour, plus a window

Neon is in `us-east-2`; the functions run in `iad1`. Every query crosses regions
at ~70ms where same-region is 1–5ms, and several sit behind every page. The
largest single slowdown in the app.

Neon cannot move a project between regions, so this is a new project and a data
migration — the only item on this list with real risk and brief downtime.

**Needs from you:** the Neon side, and a maintenance window.

### 3. Cache published customer sites — 30 min

They render fresh on every visit and read across regions, so the most public
surface we own is also the slowest. A revalidation window, invalidated on
publish.

### 4. Reprice the social kit — 20 min

At 4 credits it returns 47% on Creator and **28% on Studio** — the least
profitable thing we sell, and the thing the product most wants people to use. At
6 it is ~52% on Studio and still the cheapest way to get eight designed posts
anywhere.

**Needs from you:** the number. It is a public price.

### 5. Let people edit their own brand copy — half a day

A customer who wants one word changed in their slogan can ask the paid
assistant or pay credits to regenerate something they did not ask for. The
naming, story, values and voice are read-only on every plan. The assistant's ten
tools are already validated write paths into the same rows.

### 6. Turn on yearly billing — half a day

Columns, interval enum and Polar product fields all exist; both yearly prices
are zero, so the option never appears. Cash up front and lower churn, and no new
feature to build.

**Needs from you:** yearly prices in USD and AED, and the Polar products.

### 7. A working contact form on published sites — half a day

The contact block prints an email address as text. For a small business getting
its first website, a site that cannot take a message is half a site.

**Needs from you:** where enquiries go — the contact block's address, or
somewhere central.

### 8. Carousels and stories in Content Studio — 1 week

One of seven declared content types generates. A brand is bought once; content
is bought every week, and the plans are sold on monthly credits. The kit
renderer already composes multi-frame artwork from brand copy and a scene.

### 9. Faster logos, revealed as they land — 1–2 days

98s median for the logo step, which is the whole reason a run cannot be called a
minute long. `FAL_IMAGE_MODEL` already allows comparing a faster tier without a
deploy, and each concept can be shown when it arrives rather than both at the
end.

### 10. An admin screen for credit grants — 1 day

`adjustCredits` is written and audited through the ledger, and has no UI. Every
grant is hand-written SQL against production.

### 11. Vercel–Inngest integration — 10 minutes, yours

So syncs happen on deploy rather than by hand. **Only after Fix 1** — on a
shared app id it makes things worse by syncing every preview over production.
