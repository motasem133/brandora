# Brandora

One brief produces a whole brand identity: names, four logo concepts, palette,
type pairing, brand story and voice, a multi-page website, and a social kit,
all generated from the same brand decision so they agree with each other.

Next.js 16 (App Router, RSC) · TypeScript · Tailwind v4 · Drizzle + Postgres ·
Better Auth · Inngest · Polar · Cloudflare R2 · next-intl (English + Arabic, RTL).

## The three documents that outrank this file

Referenced by path, deliberately **not** `@`-imported: together they are ~126KB
and would load into every context window. Open the named section when the
trigger applies.

| Document | Open it when | Authority |
|---|---|---|
| `PRODUCT.md` (10KB) | Touching pricing, credits, claims, or what the product promises | Absolute. If work requires contradicting it, stop and say so. |
| `DESIGN.md` (28KB) | Touching anything visual: colour, type, spacing, motion, a component | Absolute for visual decisions. Read the relevant **Named Rule**, not the whole file. |
| `SYSTEM_DOCUMENTATION.md` (88KB) | You need schema detail, the model registry, or deployment specifics | Reference, not law. Jump to a section, never read start to finish. |

`SYSTEM_DOCUMENTATION.md` sections: 1 Overview · 2 Architecture · 3 Database
Schema · 4 Server API & Data Layer · 5 Frontend · 6 Auth · 7 AI Generation
Engine · 8 Payment & Billing · 9 Admin · 10 Deployment · 11 Env Vars · 12 Error
Handling · Appendix B Key File Reference.

`PRODUCT.md` forbids claims that are simply false: no customers, no
testimonials, no usage numbers, no "trusted by". Do not invent social proof,
not even as placeholder copy.

## Setup

```bash
pnpm install
cp .env.example .env
```

Minimum to boot: `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ bytes,
`openssl rand -base64 32`), `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`. Set
`DATABASE_URL_UNPOOLED` too on Neon, where migrations need the direct
connection; it falls back to `DATABASE_URL` when absent. Everything else is
optional and degrades: with no AI keys the app runs and generation is
unavailable rather than crashing. `src/lib/env.ts` is the full list and
validates at boot.

```bash
pnpm db:migrate && pnpm db:seed && pnpm dev
```

## Commands

```bash
pnpm dev              # dev server
pnpm typecheck        # tsc --noEmit
pnpm lint             # ESLint (see the caveat below)
pnpm test:unit        # pure logic, no database, no server
pnpm test:contrast    # contrast guard against hostile generated palettes
pnpm test:system      # HTTP suite            (needs the app running)
pnpm test:billing     # billing lifecycle     (needs app + database)
pnpm test:e2e         # Playwright            (needs the app running)
pnpm db:generate      # generate a migration after any schema change
pnpm db:seed          # plans + credit packs; SEED_ADMIN_EMAIL=you@x.com promotes an admin
```

`pnpm typecheck` and `pnpm lint` before calling anything done. CI additionally
runs a production build against a real Postgres and fails if the schema moved
without a generated migration.

> **`pnpm lint` can lie.** It runs through a wrapper that has been seen
> reporting "No issues found" against a config ESLint was refusing to load. If
> you touch `eslint.config.mjs`, verify with `npx eslint src` directly, and
> prove a new rule works by planting a violation and watching it fail.

## Where things live

| To change | Go to |
|---|---|
| A database read or write | `src/server/db/queries/` (the only place, see below) |
| What a generation run does | `src/server/services/generation.ts` → `src/server/inngest/generate.ts` |
| A prompt or model choice | `src/server/ai/prompts.ts`, `src/server/ai/models.ts` |
| Plan features or credit costs | `src/lib/credits.ts` (arithmetic), `src/server/db/seed.ts` (the plans) |
| Anything money moves through | `src/server/billing/` |
| Design tokens, utilities, motion | `src/app/globals.css` |
| A shared control | `src/components/ui/` |
| Copy, either language | `messages/en.json`, `messages/ar.json` |
| The customer's published site | `src/components/blocks/`, `src/app/sites/[subdomain]/` |

## Architecture

```
src/
├── app/          Routes. Never touches the database.
├── components/   UI. Never touches the database.
├── lib/          Isomorphic: utils, env, errors, credits arithmetic, brand-theme.
└── server/       Server-only. The database boundary.
    ├── db/queries/   Every read and write.
    ├── services/     Business logic. May hold a db handle.
    ├── actions/      Server Actions + the safe-action clients.
    ├── ai/           Model registry, prompts, generation calls.
    ├── billing/      Ledger, Polar webhook handlers, payload schemas.
    ├── inngest/      The generation job.
    └── render/       Browser-driven rendering: kit PDF, social posts.
```

**How a run works.** A Server Action validates and reserves credits up front,
then dispatches an Inngest job; the job generates section by section, writes
assets to R2, and settles the reservation against what actually succeeded, so a
failed section is never charged for. The client watches
`/api/generate/[projectId]/stream`. Sections that fail do not fail the run.

## Rules

### Enforced by ESLint (the build fails)

**The database boundary.** `@/server/db` and `drizzle-orm` cannot be imported
from `src/app/`, `src/components/` or `src/lib/`. Call a function in
`src/server/db/queries/`, and add one there rather than reaching around it.
Schema *types* are fine anywhere via `import type`.

**The radius scale.** Tailwind's default radii are banned. Use
`rounded-control` / `rounded-card` / `rounded-panel` / `rounded-full`, picked by
role. `DESIGN.md` §Shapes says which role is which. `src/components/blocks/**`
and `src/app/sites/**` are exempt: they render the customer's brand, not ours.

Both rules exist because the convention was already written down and losing
anyway, by a hundred small local decisions. Expect the same of any new one.

### Not enforced, still binding

**Server Actions are public HTTP endpoints.** Never build one from the bare
`actionClient`. Start from `orgAction`, `orgAdminAction`, `orgOwnerAction` or
`adminAction` so session and membership checks cannot be skipped.

**Credits are real money.** They buy a real API call and a real charge. Nothing
spends them without a deliberate act, and any control that can spend them shows
the price *and* the balance at the control itself.

**The ledger is the source of truth.** `organizations.credit_balance` is a
cache. Both move in one transaction, under a row lock, with an idempotency key,
via `writeLedgerEntry`. Never write a credit movement another way.

**Every surface works in Arabic, right to left.** Logical properties only
(`ms-`, `pe-`, `start-`, `end-`), never physical. `en.json` and `ar.json` stay
at key parity. Arabic is generated natively, never translated.

**Generated colour is untrusted.** It is model output. Anything putting it under
text goes through `src/lib/brand-theme.ts`, which steps the mix until it clears
4.5:1 instead of assuming a percentage. A published site once shipped a CTA at
1.42:1 because a renderer skipped it.

## Testing

`src/**/*.test.ts` is pure logic on `node --test` via tsx. No framework, no
fixtures, no mocks. Add one when you write a branch, a loop, a parser, or
anything touching money or colour. Do not add a test framework, and do not test
what the type system already guarantees.

**A green test that cannot go red is worse than none.** Break the logic, watch
it fail, restore it. Every existing suite was verified this way.

Heavier suites live in `scripts/` and `e2e/`, and all of them run in CI.

## Conventions

- Comments explain **why**, especially why the obvious alternative lost. This
  codebase does that unusually well; match it. A comment restating the code is
  noise, and one recording a defect that is now impossible is worth keeping.
- **Never write an em dash or an en dash**, anywhere: prose, comments, commit
  messages, PR bodies. Use a comma, a colon, parentheses, or a full stop.
- No AI attribution in commits, PR titles, PR bodies, or issue comments.
- Commit messages are imperative and explain the why. Read `git log` first; the
  house style is specific and good.
- Prefer an existing `ui/` primitive over a hand-rolled control. If one does not
  fit, extend it rather than growing a sibling beside it.
