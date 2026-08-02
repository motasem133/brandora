# Brandora — Full System Documentation

> **Platform**: AI-powered SaaS for brand identity generation
> **Domain**: https://brandora.enigmitic.com
> **Version**: v2.0 — Next.js rewrite · 2026-08-02
> **Supersedes**: `SYSTEM_DOCUMENTATION.v1-laravel-angular.md` (Angular 18 + Laravel 11)

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, RSC, Server Actions) on Vercel |
| Database | Neon Postgres + Drizzle ORM |
| Auth | Better Auth (email/password + Google, org plugin) |
| AI — text | OpenRouter → DeepSeek V4 Pro · Qwen3.7 Max/Plus/Flash · GLM-5.2 |
| AI — images | BytePlus ModelArk → Seedream 5.0 Pro |
| Jobs | Inngest (step functions) + SSE progress |
| Storage | Cloudflare R2 |
| Payments | Polar (Merchant of Record) |
| Email | Resend + React Email |
| UI | Tailwind v4 + shadcn/ui + next-intl (EN/AR RTL) |
| Monitoring | Sentry · PostHog · Vercel Analytics |

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [Server API & Data Layer](#4-server-api--data-layer)
5. [Frontend Documentation](#5-frontend-documentation)
6. [Authentication](#6-authentication)
7. [AI Generation Engine](#7-ai-generation-engine)
8. [Payment & Billing](#8-payment--billing)
9. [Admin Panel](#9-admin-panel)
10. [Deployment Guide](#10-deployment-guide)
11. [Environment Variables](#11-environment-variables)
12. [Error Handling](#12-error-handling)

- [Appendix A — Seeded Data](#appendix-a--seeded-data)
- [Appendix B — Key File Reference](#appendix-b--key-file-reference)
- [Appendix C — Migration from v1](#appendix-c--migration-from-v1)

---

## 1. System Overview

Brandora is a SaaS platform that lets entrepreneurs and businesses generate a complete brand identity using AI in under 60 seconds.

### What It Does

| Feature | Description |
|---|---|
| **AI Branding** | Generates business names, slogans, color palettes, fonts, brand story, logo concepts |
| **Vector Logo Export** | Auto-traces raster logo concepts to editable SVG + full brand kit ZIP (favicon, avatars, letterhead) |
| **Website Builder** | Creates multi-page website with editable content and live preview |
| **Social Media Kit** | Produces 9 Instagram posts, bios, stories, hashtags, and ad copy |
| **Brand Assistant** | Persistent per-project AI chat to refine assets conversationally instead of regenerating |
| **Multi-language** | Full English and Arabic (RTL) support |
| **Payments** | Polar subscriptions + prepaid credits, Merchant of Record (global VAT handled) |
| **Admin Panel** | User management, plan management, analytics dashboard |

### What Changed from v1

| Area | v1 (Legacy) | v2 (Current) |
|---|---|---|
| Frontend | Angular 18 SPA | Next.js 16 App Router + RSC |
| Backend | Laravel 11 REST API | Next.js Server Actions + Route Handlers |
| Database | MySQL + Eloquent | Postgres + Drizzle ORM |
| Auth | Laravel JWT + localStorage | Better Auth + httpOnly session cookies |
| AI text | OpenAI GPT-4o | OpenRouter → DeepSeek V4 / Qwen3.7 / GLM-5.2 |
| AI images | DALL·E 3 | Seedream 5.0 (BytePlus ModelArk) |
| Generation | Synchronous 60s HTTP block | Queued background job + SSE live progress |
| Payments | Stripe (self-billed) | Polar (Merchant of Record) |
| Hosting | Hostinger shared, no SSH | Vercel |

### User Journey

```
Landing Page → Register/Login → Onboarding Wizard (8 steps)
→ Project Created → Click "Generate" → job queued
→ SSE stream: branding ✓ → logos ✓ → website ✓ → social ✓
→ View Branding / Website / Social tabs
→ Refine via Brand Assistant chat → Edit / Publish / Download kit
```

---

## 2. Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Browser / Client                         │
│         React Server Components + Client Islands              │
└───────────────────────────┬──────────────────────────────────┘
                            │ RSC payload · Server Actions · SSE
┌───────────────────────────▼──────────────────────────────────┐
│                Next.js 16 on Vercel (Fluid Compute)           │
│                                                               │
│  ┌────────────┐ ┌────────────┐ ┌───────────┐ ┌────────────┐  │
│  │   app/     │ │  Server    │ │  Route    │ │ middleware │  │
│  │  (RSC      │ │  Actions   │ │  Handlers │ │  (session, │  │
│  │   pages)   │ │ (mutations)│ │ (webhooks,│ │   locale)  │  │
│  │            │ │            │ │  SSE, AI) │ │            │  │
│  └─────┬──────┘ └─────┬──────┘ └─────┬─────┘ └─────┬──────┘  │
│        └──────────────┴──────────────┴─────────────┘         │
│                            │                                  │
│  ┌─────────────────────────▼─────────────────────────────┐   │
│  │            src/server/  — the only DB boundary         │   │
│  │   db (Drizzle) · services · queue · ai · auth          │   │
│  └─────────────────────────┬─────────────────────────────┘   │
└────────────────────────────┼──────────────────────────────────┘
                             │
     ┌───────────┬───────────┼───────────┬────────────┐
     ▼           ▼           ▼           ▼            ▼
┌─────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ ┌───────────┐
│ Neon    │ │ Job    │ │OpenRouter│ │BytePlus│ │  Polar    │
│Postgres │ │ Queue  │ │ (text AI)│ │ModelArk│ │  (MoR     │
│         │ │(worker)│ │          │ │Seedream│ │ payments) │
└─────────┘ └────────┘ └──────────┘ └────────┘ └───────────┘
                             │
                        ┌────▼─────┐
                        │  Blob    │
                        │ storage  │
                        │(logos,   │
                        │ SVG,ZIP) │
                        └──────────┘
```

### Rendering & Caching Strategy

Next.js 16 makes caching **opt-in** via Cache Components. Nothing is cached unless declared.

| Surface | Strategy | Rationale |
|---|---|---|
| Landing page | `'use cache'` + PPR | Static shell, revalidates on deploy |
| Pricing / plans | `'use cache'`, tag `plans` | Revalidated when admin edits a plan |
| Dashboard, projects | Dynamic (request-time) | Per-user, session-gated |
| Project detail | Dynamic + Suspense per tab | Branding streams in before website/social |
| Published sites | `'use cache'`, tag `site:{subdomain}` | Purged on publish |
| Admin analytics | Dynamic, no cache | Always fresh |

### Directory Structure

```
brandora/
├── src/
│   ├── app/
│   │   ├── (marketing)/              ← Landing, pricing — cached + PPR
│   │   ├── (auth)/                   ← login, register, forgot, reset
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx            ← Sidebar shell, session-gated
│   │   │   ├── overview/
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx          ← List
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      ← Branding/Website/Social tabs
│   │   │   │       ├── builder/      ← Website builder
│   │   │   │       └── assistant/    ← Brand Assistant chat
│   │   │   ├── billing/
│   │   │   └── settings/
│   │   ├── (admin)/                  ← analytics, users, plans, projects
│   │   ├── onboarding/               ← 8-step wizard
│   │   ├── sites/[subdomain]/        ← Published websites (cached)
│   │   └── api/
│   │       ├── auth/[...all]/        ← Better Auth handler
│   │       ├── generate/[id]/stream/ ← SSE progress stream
│   │       ├── assistant/            ← Brand Assistant chat stream
│   │       ├── jobs/                 ← Queue worker endpoint
│   │       └── webhooks/polar/       ← Polar webhooks
│   │
│   ├── server/                       ← Server-only. Never imported by client.
│   │   ├── db/
│   │   │   ├── schema.ts             ← Drizzle table definitions
│   │   │   ├── index.ts              ← Client + connection pool
│   │   │   └── queries/              ← Typed read queries
│   │   ├── actions/                  ← Server Actions (mutations)
│   │   ├── services/                 ← Business logic
│   │   ├── ai/
│   │   │   ├── router.ts             ← OpenRouter client + model registry
│   │   │   ├── image.ts              ← Seedream / BytePlus client
│   │   │   ├── prompts/              ← Versioned prompt templates
│   │   │   ├── schemas/              ← Zod output schemas
│   │   │   └── pipeline/             ← generateBranding, Website, Social
│   │   ├── auth.ts                   ← Better Auth config
│   │   └── billing/                  ← Polar client, credits, entitlements
│   │
│   ├── components/
│   │   ├── ui/                       ← shadcn/ui primitives
│   │   └── features/                 ← Domain components
│   ├── lib/                          ← Isomorphic utils, i18n, types
│   └── styles/
│
├── drizzle/                          ← Generated SQL migrations
├── messages/                         ← en.json, ar.json
└── drizzle.config.ts
```

### Key Architectural Rules

1. **`src/server/` is the only place that touches the database.** Route handlers and Server Actions call services; services call queries.
2. **Server Actions for mutations, Route Handlers for streams and webhooks.** Anything needing SSE, a raw request body, or a third-party POST is a Route Handler.
3. **Every Server Action begins with a session + ownership check.** Server Actions are public HTTP endpoints; treat them as such.
4. **Zod validates twice** — the client form and the server boundary. Never trust the former.
5. **AI never blocks a request.** All generation is enqueued; the UI observes via SSE.
6. **Secrets never cross to the client.** Only `NEXT_PUBLIC_*` is exposed.

---

## 3. Database Schema

**Engine**: Postgres (Neon) · **ORM**: Drizzle · **Migrations**: `drizzle-kit generate` → `drizzle-kit migrate`

Conventions: `snake_case` columns, `text` primary keys for Better Auth-owned tables (its default), `uuid` for app tables, `timestamptz` everywhere, soft delete via `deleted_at`.

### Entity Relationship Diagram

```
users (1)──(many) members (many)──(1) organizations
                                          │
                                          ├── (1) subscriptions ──(1) plans
                                          ├── (many) credit_transactions
                                          ├── (many) orders
                                          │
                                          └── (many) projects
                                                       │
                                                       ├── (1) branding_assets
                                                       ├── (1) website_assets
                                                       ├── (1) social_media_assets
                                                       ├── (many) generated_files
                                                       ├── (many) generation_jobs
                                                       │            └── (many) ai_usage
                                                       └── (many) assistant_threads
                                                                    └── (many) assistant_messages
```

**Ownership rule**: every app row traces to an `organization_id`. Authorization is always "is the session user a member of this row's org?" — never "is this row's user_id my user_id".

---

### Auth Tables (owned by Better Auth)

Generated by the Better Auth CLI — do not hand-edit; extend via `additionalFields`.

| Table | Purpose | Custom fields added |
|---|---|---|
| `users` | Identity | `locale` (`en`/`ar`), `role` (`user`/`admin`), `status` (`active`/`suspended`) |
| `sessions` | Server sessions | `active_organization_id` |
| `accounts` | OAuth links (Google) + password hash | — |
| `verifications` | Email verify + password reset tokens | — |
| `organizations` | Tenant | `polar_customer_id`, `locale` |
| `members` | User ↔ org with role | role: `owner` / `admin` / `member` |
| `invitations` | Pending org invites | — |

---

### `plans`

| Column | Type | Description |
|---|---|---|
| id | uuid PK | |
| name | text | e.g. "Pro" |
| slug | text UNIQUE | e.g. `pro` |
| price_monthly | integer | **Cents**, USD. Never use float for money. |
| price_yearly | integer | Cents |
| polar_product_id | text | Polar product reference |
| monthly_credits | integer | Credits granted each billing period |
| seats | integer | Org members allowed; `-1` = unlimited |
| max_projects | integer | `-1` = unlimited |
| website_builder | boolean | Feature flag |
| social_media_kit | boolean | Feature flag |
| vector_export | boolean | Feature flag — SVG + brand kit ZIP |
| brand_assistant | boolean | Feature flag — AI chat |
| custom_domain | boolean | Feature flag |
| priority_queue | boolean | Jumps the Inngest concurrency queue |
| features | jsonb | Display-only bullet strings, per locale |
| is_active | boolean | Hidden from pricing page when false |
| sort_order | integer | |

### `subscriptions`

| Column | Type | Description |
|---|---|---|
| id | uuid PK | |
| organization_id | FK → organizations | |
| plan_id | FK → plans | |
| polar_subscription_id | text UNIQUE | |
| status | enum | `trialing`, `active`, `past_due`, `canceled`, `revoked` |
| current_period_start | timestamptz | |
| current_period_end | timestamptz | |
| cancel_at_period_end | boolean | |
| canceled_at | timestamptz nullable | |

### `credit_transactions` — append-only ledger

Never updated, never deleted. Balance is `SUM(amount)`, cached on `organizations.credit_balance` for fast reads.

| Column | Type | Description |
|---|---|---|
| id | uuid PK | |
| organization_id | FK → organizations | |
| amount | integer | **Signed**: positive = grant, negative = spend |
| balance_after | integer | Running balance snapshot for auditability |
| reason | enum | `subscription_grant`, `purchase`, `generation`, `logo_render`, `assistant_message`, `refund`, `admin_adjustment` |
| project_id | FK → projects nullable | What it was spent on |
| generation_job_id | FK nullable | |
| polar_order_id | text nullable | For top-up purchases |
| idempotency_key | text UNIQUE nullable | Prevents double-charging on webhook/job retries |
| metadata | jsonb | |
| created_at | timestamptz | |

> **Refund rule**: if a generation job fails on a step, the worker writes a compensating positive row with reason `refund`. Users are never charged for failed generations.

### `orders`

Synced from Polar webhooks — Polar remains the source of truth for invoices/receipts.

| Column | Type | Description |
|---|---|---|
| id | uuid PK | |
| organization_id | FK → organizations | |
| polar_order_id | text UNIQUE | |
| amount | integer | Cents, net |
| tax_amount | integer | Cents — collected and remitted by Polar as MoR |
| currency | text | |
| status | enum | `pending`, `paid`, `refunded` |
| invoice_url | text nullable | Hosted by Polar |
| created_at | timestamptz | |

---

### `projects`

| Column | Type | Description |
|---|---|---|
| id | uuid PK | |
| organization_id | FK → organizations | Tenant owner |
| created_by | FK → users | Attribution only, not authorization |
| title | text | Display name |
| business_name | text nullable | Optional name hint for AI |
| industry | text | |
| country | text | |
| target_audience | text | |
| brand_style | enum | `luxury`, `modern`, `playful`, `minimal`, `arabic`, `corporate` |
| preferred_colors | jsonb | Array of hex strings, max 3 |
| needs_website | boolean | |
| needs_social_media | boolean | |
| language | enum | `en`, `ar` — drives AI output language |
| status | enum | `draft`, `queued`, `generating`, `completed`, `failed`, `partial` |
| deleted_at | timestamptz nullable | Soft delete |

> `partial` is new in v2: because each pipeline step commits independently, branding can succeed while social media fails. The UI shows what landed and offers a per-section retry.

### `branding_assets`

| Column | Type | Description |
|---|---|---|
| project_id | FK UNIQUE → projects | |
| business_name_ideas | jsonb | Array of 5 `{name, rationale}` |
| slogan | text | |
| brand_story | text | |
| color_palette | jsonb | `{primary, secondary, accent, background, text}` |
| font_recommendations | jsonb | `{heading, body, accent}` + Google Fonts URLs |
| brand_values | jsonb | Array of strings |
| brand_voice | text | |
| logo_concepts | jsonb | Array of `{file_id, prompt, style}` → `generated_files` |
| model_used | text | Provenance, e.g. `deepseek/deepseek-v4-pro` |
| prompt_version | text | e.g. `branding@v3` — lets you A/B prompts |

### `website_assets`

| Column | Type | Description |
|---|---|---|
| project_id | FK UNIQUE → projects | |
| template | enum | `modern`, `minimal`, `luxury` |
| pages | jsonb | `{home, about, services, contact}` content blocks |
| custom_styles | jsonb | `{primary_color, secondary_color, font_heading, font_body}` |
| is_published | boolean | |
| subdomain | text UNIQUE nullable | Serves `/sites/[subdomain]` |
| custom_domain | text UNIQUE nullable | Paid plans only |
| published_at | timestamptz nullable | |

### `social_media_assets`

| Column | Type | Description |
|---|---|---|
| project_id | FK UNIQUE → projects | |
| instagram_bio | text | 150 chars |
| instagram_posts | jsonb | Array of 9 `{type, caption, hashtags[]}` |
| story_templates | jsonb | Array of 3 |
| ad_copy | jsonb | `{headline, body, cta, facebook_ad, google_ad}` |
| hashtags | jsonb | Array of 10 |

### `generated_files`

Every binary artifact. Blobs live in R2; this table holds the metadata.

| Column | Type | Description |
|---|---|---|
| id | uuid PK | |
| project_id | FK → projects | |
| kind | enum | `logo_raster`, `logo_svg`, `favicon`, `social_avatar`, `letterhead`, `brand_kit_zip`, `upload` |
| r2_key | text | Object key in the R2 bucket |
| mime_type | text | |
| size_bytes | integer | |
| width / height | integer nullable | |
| metadata | jsonb | Source model, prompt, trace params |

---

### `generation_jobs`

Drives the SSE progress stream and makes generation resumable.

| Column | Type | Description |
|---|---|---|
| id | uuid PK | |
| project_id | FK → projects | |
| inngest_run_id | text nullable | Cross-reference into the Inngest dashboard |
| trigger | enum | `initial`, `retry_section`, `regenerate` |
| sections | jsonb | Requested steps, e.g. `["branding","logos","website","social"]` |
| progress | jsonb | Per-step `{step: {status, started_at, finished_at, error}}` |
| status | enum | `queued`, `running`, `completed`, `failed`, `partial` |
| credits_reserved | integer | Held at enqueue |
| credits_charged | integer | Settled at completion; remainder refunded |
| error | text nullable | |
| started_at / finished_at | timestamptz nullable | |

### `ai_usage`

One row per model call. This is how you learn your true per-user margin.

| Column | Type | Description |
|---|---|---|
| id | uuid PK | |
| organization_id | FK → organizations | |
| project_id | FK nullable | |
| generation_job_id | FK nullable | |
| feature | enum | `branding`, `website`, `social`, `logo`, `assistant`, `vectorize` |
| provider | enum | `openrouter`, `byteplus` |
| model | text | e.g. `qwen/qwen3.7-max`, `seedream-5-0-pro` |
| input_tokens / output_tokens | integer | |
| cached_tokens | integer | Prompt-cache hits — billed far lower |
| images_generated | integer | |
| cost_usd | numeric(12,6) | Actual upstream cost, from the provider response |
| latency_ms | integer | |
| status | enum | `success`, `error`, `timeout` |
| created_at | timestamptz | |

> Index on `(organization_id, created_at)` and `(model, created_at)` — the first powers per-customer margin, the second powers "is DeepSeek still cheaper than Qwen for branding?".

---

### `assistant_threads` / `assistant_messages`

| `assistant_threads` | Type | Description |
|---|---|---|
| id | uuid PK | |
| project_id | FK → projects | |
| title | text | Auto-summarized from first message |
| created_by | FK → users | |

| `assistant_messages` | Type | Description |
|---|---|---|
| id | uuid PK | |
| thread_id | FK → assistant_threads | |
| role | enum | `user`, `assistant`, `tool` |
| content | text | |
| tool_calls | jsonb nullable | Applied asset mutations, e.g. `update_palette` |
| model | text nullable | |
| created_at | timestamptz | |

> The assistant edits assets through **tool calls**, not free text. `update_palette`, `rewrite_slogan`, `regenerate_post` each map to a validated service function, so a chat reply can never corrupt an asset row.

---

### Required Indexes

```sql
CREATE INDEX ON projects (organization_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX ON members (user_id, organization_id);
CREATE INDEX ON credit_transactions (organization_id, created_at DESC);
CREATE UNIQUE INDEX ON credit_transactions (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX ON ai_usage (organization_id, created_at DESC);
CREATE INDEX ON generation_jobs (project_id, created_at DESC);
CREATE UNIQUE INDEX ON website_assets (subdomain) WHERE subdomain IS NOT NULL;
```

---

## 4. Server API & Data Layer

There is **no REST API**. Pages read data directly in React Server Components; mutations go through Server Actions. Route Handlers exist only where HTTP semantics are genuinely required: webhooks, SSE streams, and auth callbacks.

### The Three Layers

```
RSC page  ─────► src/server/db/queries/   ─────► Drizzle ─────► Postgres
                        (reads)

Server Action ──► src/server/services/    ─────► queries + AI + queue
   (next-safe-action: validate → authorize → execute → revalidate)

Route Handler ─► services                       (webhooks, SSE, auth)
```

### Action Middleware — the security backbone

Every mutation is built from one of three clients. This is the only thing standing between a Server Action and the open internet.

```ts
// src/server/actions/safe-action.ts
import { createSafeActionClient } from 'next-safe-action'

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    if (e instanceof AppError) return e.message
    logger.error(e)
    return 'Something went wrong.'
  },
})

/** Requires a valid session. */
export const authedAction = actionClient.use(async ({ next }) => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new AppError('UNAUTHORIZED', 'Please sign in.')
  return next({ ctx: { user: session.user, session } })
})

/** Requires membership in the active organization. */
export const orgAction = authedAction.use(async ({ next, ctx }) => {
  const orgId = ctx.session.activeOrganizationId
  if (!orgId) throw new AppError('NO_ORG', 'No active organization.')
  const member = await getMembership(ctx.user.id, orgId)
  if (!member) throw new AppError('FORBIDDEN', 'Not a member.')
  return next({ ctx: { ...ctx, orgId, role: member.role } })
})

/** Requires platform admin. */
export const adminAction = authedAction.use(async ({ next, ctx }) => {
  if (ctx.user.role !== 'admin') throw new AppError('FORBIDDEN', 'Admins only.')
  return next({ ctx })
})
```

> **Rule**: no action is ever built from `actionClient` directly except `login`, `register`, `forgotPassword`, and `resetPassword`. Everything else starts at `orgAction` or above.

### Anatomy of an Action

```ts
// src/server/actions/projects.ts
'use server'

export const createProject = orgAction
  .metadata({ name: 'create-project' })
  .schema(createProjectSchema)                  // Zod — same schema the form uses
  .action(async ({ parsedInput, ctx }) => {
    await assertWithinPlanLimits(ctx.orgId, 'projects')
    const project = await projectService.create({ ...parsedInput, orgId: ctx.orgId, createdBy: ctx.user.id })
    revalidateTag(`projects:${ctx.orgId}`)
    return { projectId: project.id }
  })
```

---

### Server Action Catalog

#### Projects — `src/server/actions/projects.ts`

| Action | Client | Input | Effect |
|---|---|---|---|
| `createProject` | orgAction | Onboarding wizard payload | Creates project (`draft`), checks plan limits |
| `updateProject` | orgAction | `{ id, ...fields }` | Edits onboarding inputs |
| `deleteProject` | orgAction | `{ id }` | Soft delete |
| `startGeneration` | orgAction | `{ id, sections[] }` | Reserves credits, creates `generation_jobs`, sends Inngest event |
| `retrySection` | orgAction | `{ id, section }` | Re-runs one failed pipeline step |
| `updateWebsiteContent` | orgAction | `{ id, pages, custom_styles }` | Saves builder edits |
| `publishWebsite` | orgAction | `{ id, subdomain }` | Publishes, purges `site:{subdomain}` cache tag |
| `unpublishWebsite` | orgAction | `{ id }` | |
| `buildBrandKit` | orgAction | `{ id }` | Enqueues SVG trace + ZIP packaging |

#### Billing — `src/server/actions/billing.ts`

| Action | Client | Effect |
|---|---|---|
| `createCheckout` | orgAction | Returns a Polar checkout URL for a plan or credit pack |
| `openCustomerPortal` | orgAction | Returns a Polar customer portal session URL |
| `cancelSubscription` | orgAction | Sets `cancel_at_period_end` via Polar API |

#### Organization — `src/server/actions/organization.ts`

| Action | Client | Effect |
|---|---|---|
| `createOrganization` | authedAction | New tenant, creator becomes `owner` |
| `inviteMember` | orgAction (owner/admin) | Sends invite email, seat-limit checked |
| `removeMember` | orgAction (owner/admin) | |
| `updateMemberRole` | orgAction (owner) | |
| `switchOrganization` | authedAction | Sets `session.active_organization_id` |

#### Admin — `src/server/actions/admin.ts`

| Action | Client | Effect |
|---|---|---|
| `updateUserStatus` | adminAction | Suspend / activate |
| `updateUserRole` | adminAction | Promote / demote |
| `upsertPlan` | adminAction | Create or edit plan, revalidates `plans` tag |
| `grantCredits` | adminAction | Writes `admin_adjustment` ledger row |

---

### Route Handlers

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/[...all]` | GET, POST | — | Better Auth catch-all (sign-in, OAuth, callbacks) |
| `/api/generate/[projectId]/stream` | GET | Session + org | SSE progress stream |
| `/api/assistant` | POST | Session + org | Brand Assistant streaming chat |
| `/api/inngest` | POST | Inngest signature | Function serve endpoint |
| `/api/webhooks/polar` | POST | Polar signature | Subscription + order events |
| `/api/files/[id]` | GET | Session + org | Signed R2 download redirect |

### SSE Progress Stream

The client opens one `EventSource` per running job. The handler tails `generation_jobs.progress`; the Inngest worker writes to it after each step.

```ts
// src/app/api/generate/[projectId]/stream/route.ts
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: Request, { params }: Params) {
  const { projectId } = await params
  await assertProjectAccess(projectId)          // session + org membership

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

      const poll = setInterval(async () => {
        const job = await getLatestJob(projectId)
        send('progress', job.progress)
        if (job.status !== 'running' && job.status !== 'queued') {
          send('done', { status: job.status })
          clearInterval(poll); controller.close()
        }
      }, 1500)

      req.signal.addEventListener('abort', () => { clearInterval(poll); controller.close() })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',      // required or the proxy buffers the stream
    },
  })
}
```

> **Why polling inside the stream instead of pub/sub?** The DB is already the source of truth for job state, the poll is a single indexed read, and it survives the worker and the web request living on different machines. Swap in Redis pub/sub only if concurrent jobs exceed a few hundred.

### Error Contract

Actions never throw raw errors to the client. `next-safe-action` returns a discriminated result:

```ts
{ data?: T, serverError?: string, validationErrors?: Record<string, string[]> }
```

Client components render `validationErrors` inline on the field and `serverError` in a toast.

---

## 5. Frontend Documentation

**Stack**: React 19 Server Components · Tailwind CSS v4 · shadcn/ui · next-intl · dnd-kit

### Routing Structure

Locale is a path segment (`/en/...`, `/ar/...`) so both languages are independently crawlable.

| Route | Rendering | Access | Description |
|---|---|---|---|
| `/[locale]` | Cached + PPR | Public | Landing page |
| `/[locale]/pricing` | Cached, tag `plans` | Public | Plans |
| `/[locale]/login` · `/register` | Static | Guest | Auth forms |
| `/[locale]/forgot-password` · `/reset-password` | Static | Guest | Password recovery |
| `/[locale]/onboarding` | Dynamic | Auth | 8-step wizard |
| `/[locale]/dashboard` | Dynamic | Auth | Overview + stats |
| `/[locale]/dashboard/projects` | Dynamic | Org member | Project list |
| `/[locale]/dashboard/projects/[id]` | Dynamic + Suspense | Org member | Branding / Website / Social tabs |
| `/[locale]/dashboard/projects/[id]/builder` | Dynamic, client-heavy | Org member | Block website builder |
| `/[locale]/dashboard/projects/[id]/assistant` | Dynamic, streaming | Org member | Brand Assistant chat |
| `/[locale]/dashboard/billing` | Dynamic | Org member | Plan, credits, orders |
| `/[locale]/dashboard/settings` | Dynamic | Auth | Profile, org, members, appearance |
| `/[locale]/admin/*` | Dynamic | Admin | Analytics, users, plans, projects |
| `/sites/[subdomain]` | Cached, tag `site:{sub}` | Public | Published customer websites |

### Replacing v1's Guards

Angular's `authGuard` / `guestGuard` / `adminGuard` map onto two layers — and the second is the one that matters:

| v1 Guard | v2 Equivalent |
|---|---|
| `authGuard` | `middleware.ts` session-cookie check → redirect (UX only) **+** `orgAction` / RSC `requireSession()` (real enforcement) |
| `guestGuard` | Middleware redirect to `/dashboard` when a session cookie exists |
| `adminGuard` | Middleware path check **+** `adminAction` / `requireAdmin()` in every admin page and action |

> Middleware is a redirect convenience, **not** a security boundary. It can be bypassed by calling a Server Action directly. Every page and action re-checks.

### Middleware Responsibilities

```ts
// middleware.ts — runs before every request
// 1. Locale negotiation: infer from path → cookie → Accept-Language → default 'en'
// 2. Session cookie presence check → redirect unauthenticated users off /dashboard
// 3. Reverse: redirect authenticated users off /login and /register
// 4. Subdomain rewrite: {sub}.brandora.app → /sites/{sub}
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
```

### Component Conventions

```
components/
├── ui/                    ← shadcn primitives (Button, Dialog, Input...) — never edited ad hoc
└── features/
    ├── onboarding/        ← WizardShell, StepIndustry, StepStyle, ColorPicker
    ├── projects/          ← ProjectCard, GenerationProgress, PalettePreview, LogoGrid
    ├── builder/           ← BlockCanvas, BlockInspector, DevicePreview, BlockLibrary
    ├── assistant/         ← ChatThread, MessageBubble, ToolCallCard
    └── billing/           ← PlanCard, CreditMeter, OrderTable
```

**Rules**
- Server Component by default. Add `'use client'` only for interactivity, and push it as far down the tree as possible.
- Never pass a whole DB row into a client component — map it to a narrow view model first, or you leak columns into the RSC payload.
- Loading states use `loading.tsx` + Suspense, never a client-side `isLoading` boolean.

### Forms

`react-hook-form` + `zodResolver`, sharing the exact Zod schema the Server Action validates with.

```tsx
'use client'
const { form, handleSubmitWithAction } = useHookFormAction(createProject, zodResolver(createProjectSchema), {
  actionProps: { onSuccess: ({ data }) => router.push(`/dashboard/projects/${data.projectId}`) },
})
```

### Generation Progress UI

```tsx
'use client'
export function GenerationProgress({ projectId }: { projectId: string }) {
  const [progress, setProgress] = useState<Progress>({})

  useEffect(() => {
    const es = new EventSource(`/api/generate/${projectId}/stream`)
    es.addEventListener('progress', e => setProgress(JSON.parse(e.data)))
    es.addEventListener('done', () => { es.close(); router.refresh() })  // refresh RSC data
    return () => es.close()
  }, [projectId])

  return <StepList steps={['branding','logos','website','social']} progress={progress} />
}
```

Each step renders pending → running → done ✓ → failed ✗ with a per-step **Retry** button wired to `retrySection`.

### Website Builder

Pages are stored as an ordered array of typed blocks rather than fixed page objects — this is the main structural change from v1.

```ts
type Block =
  | { id: string; type: 'hero';      props: { title: string; subtitle: string; cta: string; image?: string } }
  | { id: string; type: 'features';  props: { heading: string; items: { icon: string; title: string; body: string }[] } }
  | { id: string; type: 'about';     props: { heading: string; body: string; image?: string } }
  | { id: string; type: 'services';  props: { heading: string; services: { title: string; body: string; price?: string }[] } }
  | { id: string; type: 'testimonials' | 'gallery' | 'cta' | 'contact' | 'footer'; props: Record<string, unknown> }

type WebsitePages = Record<'home' | 'about' | 'services' | 'contact', Block[]>
```

| Panel | Contents |
|---|---|
| **Toolbar** | Page selector, device toggle (desktop/tablet/mobile), undo/redo, Save, Publish |
| **Block Library (left)** | Draggable block types; drag onto the canvas to insert |
| **Canvas (center)** | Live-rendered blocks, `dnd-kit` sortable, click to select |
| **Inspector (right)** | Fields for the selected block + global theme (colors, fonts) |

- Reordering and edits are **optimistic** via `useOptimistic`; autosave debounces 2s into `updateWebsiteContent`.
- The same `<BlockRenderer/>` renders both the editor canvas and the published server-rendered site, so preview and production can never drift.
- Undo/redo is a local history stack of block-array snapshots, capped at 50 entries.

### RTL & Theming

Tailwind v4 logical properties handle direction automatically — write `ps-4`/`pe-4`, never `pl-4`/`pr-4`.

```tsx
// app/[locale]/layout.tsx
<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
```

| Concern | Approach |
|---|---|
| Direction | `dir` attribute on `<html>`, set server-side from the locale segment |
| Fonts | `next/font` — Inter/Syne for `en`, IBM Plex Sans Arabic for `ar`, swapped per locale |
| Theme | `next-themes`, class strategy, dark default, no flash via inline script |
| Tokens | Tailwind v4 `@theme` block in `globals.css` — CSS variables, no JS config file |
| Icons that flip | Chevrons/arrows use `rtl:rotate-180`; logos and charts never flip |
| Numerals | `Intl.NumberFormat` per locale; prices always Western digits |

---

## 6. Authentication

**Library**: Better Auth · **Session**: httpOnly, secure, SameSite=Lax cookie · **Email**: Resend + React Email

### Why cookies instead of v1's localStorage JWT

| | v1 (JWT in localStorage) | v2 (httpOnly session cookie) |
|---|---|---|
| XSS exposure | Any injected script can read the token | JavaScript cannot read the cookie |
| Server Components | Token unavailable during SSR | Cookie sent automatically, session readable in RSC |
| Revocation | Impossible before expiry | Delete the session row — instant |
| Refresh logic | Manual `/auth/refresh` + interceptor | Rolling expiry handled by the library |

### Configuration

```ts
// src/server/auth.ts
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,       // gate is at generation time, not login
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) =>
      sendEmail({ to: user.email, template: 'reset-password', locale: user.locale, props: { url } }),
  },

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) =>
      sendEmail({ to: user.email, template: 'verify-email', locale: user.locale, props: { url } }),
  },

  // Postgres-backed — no Redis, no extra service.
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 20,
    customRules: {
      '/sign-in/email':        { window: 60, max: 5 },
      '/sign-up/email':        { window: 3600, max: 5 },
      '/forget-password':      { window: 3600, max: 3 },
      '/verify-email':         { window: 3600, max: 10 },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,          // 30 days
    updateAge: 60 * 60 * 24,               // rolling refresh once per day
    cookieCache: { enabled: true, maxAge: 300 },   // avoids a DB read on every request
  },

  user: {
    additionalFields: {
      locale: { type: 'string', defaultValue: 'en' },
      role:   { type: 'string', defaultValue: 'user', input: false },   // never client-settable
      status: { type: 'string', defaultValue: 'active', input: false },
    },
  },

  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
      creatorRole: 'owner',
      sendInvitationEmail: async ({ email, inviter, organization, id }) =>
        sendEmail({ to: email, template: 'org-invite', props: { inviter, organization, id } }),
    }),
    nextCookies(),                          // must be last
  ],
})
```

> `input: false` on `role` and `status` is load-bearing. Without it, a crafted sign-up request could set `role: "admin"` on itself.

### Session Access

```ts
// RSC / Server Action
const session = await auth.api.getSession({ headers: await headers() })

// Client component
const { data: session, isPending } = authClient.useSession()
```

### Flows

**Email + password sign-up**
```
1. Form → authClient.signUp.email()
2. User row + account row (Argon2id hash) created
3. Personal organization auto-created, user becomes owner
4. Verification email queued via Resend
5. Session cookie set → redirect to /onboarding
6. Dashboard accessible; generation blocked until verified
```

**Google OAuth**
```
1. authClient.signIn.social({ provider: 'google' })
2. Redirect to Google consent
3. Callback → /api/auth/callback/google
4. Account linked by verified email if the user already exists
5. email_verified = true immediately (Google already verified it)
6. Session cookie set → /onboarding or /dashboard
```

**Verification gate at generation**
```ts
// src/server/services/generation.ts
if (!user.emailVerified) {
  throw new AppError('EMAIL_NOT_VERIFIED', 'Please verify your email to generate.')
}
```
The UI renders a persistent banner with a "Resend email" button, rate-limited to 10/hour.

### Authorization Model

Two independent axes — never conflate them:

| Axis | Field | Question it answers |
|---|---|---|
| **Platform role** | `users.role` | Can this person administer *Brandora*? |
| **Org role** | `members.role` | What can this person do inside *this tenant*? |

| Capability | owner | admin | member |
|---|---|---|---|
| View/create projects | ✓ | ✓ | ✓ |
| Generate (spend credits) | ✓ | ✓ | ✓ |
| Publish website | ✓ | ✓ | ✗ |
| Invite / remove members | ✓ | ✓ | ✗ |
| Change roles | ✓ | ✗ | ✗ |
| Manage billing | ✓ | ✗ | ✗ |
| Delete organization | ✓ | ✗ | ✗ |

### Transactional Emails

React Email templates, rendered per locale with RTL support for Arabic.

| Template | Trigger |
|---|---|
| `verify-email` | Sign-up |
| `reset-password` | Forgot password |
| `org-invite` | Member invited |
| `generation-complete` | Job finished (opt-in) |
| `generation-failed` | Job failed — includes credit-refund confirmation |
| `credits-low` | Balance drops below 20% of the monthly grant |
| `subscription-*` | Polar lifecycle events |

---

## 7. AI Generation Engine

**Text**: OpenRouter (single key, all Chinese models) · **Images**: BytePlus ModelArk (Seedream 5.0) · **Orchestration**: Inngest · **SDK**: Vercel AI SDK v5

### Providers

```ts
// src/server/ai/router.ts
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

export const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': 'https://brandora.app',   // attribution on OpenRouter leaderboards
    'X-Title': 'Brandora',
  },
})
```

| Provider | Base URL | Used for |
|---|---|---|
| OpenRouter | `https://openrouter.ai/api/v1` | All text generation and the assistant |
| BytePlus ModelArk | `https://ark.ap-southeast.bytepluses.com/api/v3` | Seedream 5.0 image generation |

---

### Model Registry

One file decides every model choice. Changing a model is a one-line diff, and `ai_usage` records what actually ran.

```ts
// src/server/ai/models.ts
export const MODELS = {
  brandingEn:  { primary: 'deepseek/deepseek-v4-pro', fallbacks: ['z-ai/glm-5.2', 'qwen/qwen3.7-plus'] },
  brandingAr:  { primary: 'qwen/qwen3.7-max',         fallbacks: ['qwen/qwen3.7-plus', 'z-ai/glm-5.2'] },
  website:     { primary: 'z-ai/glm-5.2',             fallbacks: ['deepseek/deepseek-v4-pro', 'qwen/qwen3.7-plus'] },
  social:      { primary: 'qwen/qwen3.7-plus',        fallbacks: ['z-ai/glm-5.2', 'deepseek/deepseek-v4-flash'] },
  utility:     { primary: 'qwen/qwen3.7-flash',       fallbacks: ['deepseek/deepseek-v4-flash'] },
  assistant:   { primary: 'z-ai/glm-5.2',             fallbacks: ['deepseek/deepseek-v4-pro'] },
} as const
```

#### Why each model

| Task | Model | Price in/out ($/M) | Rationale |
|---|---|---|---|
| **Brand strategy — EN** | `deepseek/deepseek-v4-pro` | 0.44 / 0.87 | Strongest reasoning-per-dollar. Naming and positioning are genuine reasoning tasks, not text completion — the model has to hold industry, audience, and style constraints simultaneously. |
| **Brand strategy — AR** | `qwen/qwen3.7-max` | 1.48 / 4.43 | Leads general-purpose models on Arabic (BALSAM, ArabicMMLU). Critically, it produces names that work *culturally* in the Gulf, not literal translations of English ideas. Worth 5x on the single highest-value output. |
| **Website copy** | `z-ai/glm-5.2` | 0.28 / 0.89 | Best structured-JSON adherence of the cheap tier — matters when emitting a deeply nested 4-page block tree. 1M context fits the full brand kit as grounding. |
| **Social captions** | `qwen/qwen3.7-plus` | 0.32 / 1.28 | Short punchy copy with emoji and hashtag instincts; strong bilingual. 4x cheaper than Max for content where flagship reasoning adds nothing. |
| **Utility** (hashtags, tags, titles, moderation) | `qwen/qwen3.7-flash` | 0.03 / 0.13 | Effectively free. Never spend a flagship model on a classification task. |
| **Brand Assistant** | `z-ai/glm-5.2` | 0.28 / 0.89 | Most reliable tool-calling among the Chinese models and purpose-built for agentic loops. Cheap enough that chat can be unmetered. |
| **Logo concepts** | `seedream-5-0-pro` | $0.075/image | Best-in-class **text-in-image** rendering. This is the whole argument: a logo is usually a wordmark, and most image models still mangle letterforms — especially Arabic script. |

> **Deliberately not chosen:** Kimi K3 (excellent, but 3.00/15.00 is unjustifiable when no task needs long-horizon agentic reasoning) and MiniMax M3 (fine generalist, but never the best at any single task here).

---

### Pipeline

Every step is an Inngest `step.run` — independently retried, independently committed, independently resumable.

```ts
// src/server/ai/pipeline/generate.ts
export const generateBrand = inngest.createFunction(
  {
    id: 'generate-brand',
    concurrency: [{ key: 'event.data.orgId', limit: 2 }],   // one org can't starve the queue
    retries: 2,
    onFailure: refundAndMarkFailed,
  },
  { event: 'brand/generate.requested' },
  async ({ event, step }) => {
    const { projectId, jobId, sections } = event.data
    const project = await step.run('load', () => loadProject(projectId))

    // 1 — Brand identity (blocking: everything downstream is grounded in it)
    const branding = await step.run('branding', async () => {
      const result = await generateBranding(project)
      await saveBrandingAsset(projectId, result)
      await markStep(jobId, 'branding', 'done')
      return result
    })

    // 2 — Logos, website, social all depend only on branding → run in parallel
    await Promise.all([
      step.run('logos', async () => {
        const logos = await generateLogoConcepts(project, branding, { count: 4 })
        const files = await Promise.all(logos.map(l => uploadToR2(projectId, l)))
        const vectors = await Promise.all(files.map(f => vectorize(f)))   // VTracer WASM
        await saveLogoFiles(projectId, files, vectors)
        await markStep(jobId, 'logos', 'done')
      }),

      project.needsWebsite
        ? step.run('website', async () => {
            await saveWebsiteAsset(projectId, await generateWebsite(project, branding))
            await markStep(jobId, 'website', 'done')
          })
        : null,

      project.needsSocialMedia
        ? step.run('social', async () => {
            await saveSocialAsset(projectId, await generateSocial(project, branding))
            await markStep(jobId, 'social', 'done')
          })
        : null,
    ].filter(Boolean))

    // 3 — Package downloadable brand kit
    await step.run('brand-kit', () => buildBrandKitZip(projectId))

    return step.run('settle', () => settleJob(jobId))   // charge actual, refund the rest
  },
)
```

```
brand/generate.requested
        │
        ▼
   [ branding ]  ← DeepSeek V4 Pro (en) / Qwen3.7 Max (ar)
        │
        ├──────────────┬──────────────┐
        ▼              ▼              ▼
    [ logos ]     [ website ]    [ social ]
  Seedream 5 ×4    GLM-5.2      Qwen3.7 Plus
        │              │              │
   [vectorize]         │              │
    VTracer WASM       │              │
        └──────────────┴──────────────┘
                       ▼
                 [ brand-kit zip ]
                       ▼
                   [ settle ]
```

> **Why branding blocks and the rest parallelize**: website copy and social captions must reference the *chosen* brand name, voice, and palette. Generating them concurrently with branding would produce three mutually inconsistent brands.

---

### Structured Output

Never parse free text. Every call goes through `generateObject` with a Zod schema, so a malformed response is a typed retry rather than a runtime crash.

```ts
// src/server/ai/schemas/branding.ts
export const brandingSchema = z.object({
  businessNameIdeas: z.array(z.object({
    name: z.string().min(2).max(40),
    rationale: z.string().max(200),
  })).length(5),
  slogan: z.string().max(80),
  brandStory: z.string().min(200).max(1200),
  colorPalette: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  fontRecommendations: z.object({
    heading: z.string(), body: z.string(), accent: z.string().optional(),
  }),
  brandValues: z.array(z.string()).min(3).max(5),
  brandVoice: z.string().max(400),
})
```

```ts
// src/server/ai/generate.ts — the single wrapper every text call goes through
export async function runModel<T>(task: keyof typeof MODELS, opts: RunOpts<T>): Promise<T> {
  const chain = [MODELS[task].primary, ...MODELS[task].fallbacks]

  for (const [i, model] of chain.entries()) {
    const started = Date.now()
    try {
      const { object, usage, providerMetadata } = await generateObject({
        model: openrouter(model),
        schema: opts.schema,
        system: opts.system,
        prompt: opts.prompt,
        temperature: opts.temperature ?? 0.8,
        maxRetries: 1,
      })

      await recordUsage({
        model, feature: task, status: 'success',
        inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
        cachedTokens: providerMetadata?.openrouter?.cachedTokens ?? 0,
        costUsd: providerMetadata?.openrouter?.usage?.cost ?? estimateCost(model, usage),
        latencyMs: Date.now() - started,
        ...opts.context,
      })
      return object
    } catch (err) {
      await recordUsage({ model, feature: task, status: 'error', latencyMs: Date.now() - started, ...opts.context })
      logger.warn({ err, model, task, attempt: i }, 'model failed, falling back')
      if (i === chain.length - 1) throw new AIGenerationError(task, err)
    }
  }
  throw new AIGenerationError(task, 'chain exhausted')
}
```

> OpenRouter returns real upstream cost in its response — always prefer it over `estimateCost()`, which is only a fallback for providers that omit it.

---

### Prompt Design

Prompts live in `src/server/ai/prompts/` as versioned template functions, never inline strings.

**Every prompt:**
- Declares the output language explicitly (`en` → English, `ar` → Modern Standard Arabic, Gulf-appropriate)
- Injects the full project context: industry, country, audience, style, preferred colors
- Grounds downstream steps in the *already-generated* branding, never regenerating identity
- Carries a version tag (`branding@v3`) persisted to `branding_assets.prompt_version` for A/B analysis
- Relies on the Zod schema for structure — the prompt describes *intent*, not JSON shape

```ts
// src/server/ai/prompts/branding.ts
export const BRANDING_PROMPT_VERSION = 'branding@v3'

export const brandingSystem = (locale: Locale) => `
You are a senior brand strategist with 15 years at top-tier agencies.
You create brand identities that are commercially viable, culturally grounded, and legally distinctive.

Output language: ${locale === 'ar' ? 'Modern Standard Arabic, natural to Gulf readers' : 'English'}.

Hard rules:
- Names must be pronounceable, unlikely to be trademarked, and free of unintended meanings in the target market.
- Palettes must meet WCAG AA contrast between the text and background values you return.
- Fonts must exist on Google Fonts${locale === 'ar' ? ' with full Arabic glyph coverage' : ''}.
- Never mention that you are an AI. Never explain your process.
`.trim()
```

> **Arabic is not translated English.** For `locale === 'ar'`, the model generates natively in Arabic from the start. Naming, idiom, and rhythm do not survive translation — this is the single biggest quality difference from v1.

---

### Logo Generation

```ts
// src/server/ai/image.ts
export async function generateLogoConcepts(project: Project, branding: Branding, { count = 4 }) {
  const styles = ['wordmark', 'lettermark monogram', 'abstract geometric icon', 'emblem badge'] as const

  return Promise.all(styles.slice(0, count).map(style =>
    seedream({
      model: 'seedream-5-0-pro',
      prompt: logoPrompt({ style, name: branding.businessNameIdeas[0].name, project, branding }),
      size: '1024x1024',
      watermark: false,
      response_format: 'url',
    })
  ))
}
```

Prompt construction constraints that matter for logos specifically:

| Constraint | Why |
|---|---|
| Exact business name in quotes, spelled letter-by-letter | Prevents the model from inventing similar-looking words |
| "flat vector, solid fills, no gradients, no photorealism" | Gradients and noise destroy the downstream SVG trace |
| "centered on plain white background, generous margins" | Clean background separation for vectorization |
| Explicit hex codes from the generated palette | Keeps the logo consistent with the rest of the identity |
| "no mockup, no business card, no 3D render" | Image models love adding unrequested context |
| For `ar`: "Arabic script, correct letter joining, Kufic/Naskh influence" | Most models break Arabic ligatures; Seedream handles them |

### Vectorization

```
Seedream PNG (1024×1024)
   → trim whitespace + quantize to palette colors (sharp)
   → VTracer WASM: color mode, spline fitting, filter speckle 4
   → SVGO: minify, strip metadata, merge paths
   → upload as logo_svg → generated_files
```

Runs inside the Inngest worker with zero per-image cost and no network hop. Quality is strong on flat vector logos, which is precisely what the prompt constraints above guarantee.

**Brand kit ZIP contents:**
```
brand-kit.zip
├── logo/           primary.svg, primary.png (1024, 512, 256), favicon.ico, monochrome.svg
├── social/         avatar-1080.png, og-image-1200x630.png, banner-1500x500.png
├── palette/        palette.png, palette.ase (Adobe swatches), tokens.css, tokens.json
├── fonts/          FONTS.txt with Google Fonts links + CSS @import
└── brand-guide.pdf One-page identity summary: logo, palette, fonts, voice, values
```

---

### Brand Assistant

A tool-calling loop over GLM-5.2. It edits assets through validated functions — it can never write arbitrary data into an asset row.

```ts
const assistantTools = {
  updatePalette:    { input: colorPaletteSchema,   run: (i, ctx) => patchBranding(ctx.projectId, { colorPalette: i }) },
  rewriteSlogan:    { input: z.object({ slogan: z.string().max(80) }),      run: ... },
  rewriteStory:     { input: z.object({ brandStory: z.string().max(1200) }), run: ... },
  regeneratePost:   { input: z.object({ index: z.number().min(0).max(8), direction: z.string() }), run: ... },
  updateFonts:      { input: fontSchema,           run: ... },
  regenerateLogos:  { input: z.object({ direction: z.string() }), run: ... },   // costs credits — confirmed in UI
  proposeNames:     { input: z.object({ direction: z.string() }), run: ... },
}
```

| Rule | Reason |
|---|---|
| Context = full brand kit + last 20 messages | 1M context makes truncation unnecessary; 20 turns keeps cost predictable |
| Every tool result is re-validated with the same Zod schema as generation | The assistant cannot produce an asset shape the generator couldn't |
| Credit-spending tools (`regenerateLogos`) require explicit UI confirmation | No surprise charges from a chat message |
| Responses stream via `streamText` over a Route Handler | Server Actions cannot stream tokens |
| Every message writes a row to `ai_usage` | Chat is cheap but not free — it must show up in margin |

---

### Cost Model

Measured per full generation (branding + 4 logos + website + social), English:

| Step | Model | ~Tokens / images | Cost |
|---|---|---|---|
| Branding | DeepSeek V4 Pro | 1.5K in / 2K out | $0.0024 |
| Website | GLM-5.2 | 2K in / 4K out | $0.0041 |
| Social | Qwen3.7 Plus | 2K in / 3.5K out | $0.0051 |
| Utility | Qwen3.7 Flash | ~1K | $0.0002 |
| **Logos** | **Seedream 5.0 Pro** | **4 images** | **$0.3000** |
| Vectorize + ZIP | VTracer / sharp | — | $0.0000 |
| **Total** | | | **≈ $0.312** |

Arabic swaps branding to Qwen3.7 Max: **≈ $0.32**.

> **The headline finding: images are 96% of the cost. Text is ~$0.012.**
>
> Two consequences drive the whole architecture:
> 1. **Never economize on text models.** Using flagship Chinese models for every text task costs about a penny per generation. Downgrading to save $0.004 would be irrational.
> 2. **Logo count is the only real cost lever.** Pricing, plan tiers, and credit costs should all be designed around image count, not tokens.

**vs v1**: GPT-4o for all three text steps cost ≈ $0.109 — roughly **9× more than the entire v2 text pipeline**, at lower Arabic quality.

### Credit Costs

1 credit ≈ $0.05 of upstream cost.

Costs are charged per section and summed, so a partial run only ever costs what it produced.

| Operation | Credits | Upstream cost |
|---|---|---|
| Full generation (4 logos) | 9 | ~$0.31 |
| Text-only generation (no logos) | 3 | ~$0.012 |
| Branding text only | 1 | ~$0.003 |
| Logo pack (4 concepts) | 6 | ~$0.30 |
| Single logo re-roll | 2 | ~$0.075 |
| Website regenerate | 1 | ~$0.004 |
| Social regenerate | 1 | ~$0.005 |
| Brand kit ZIP rebuild | 0 | ~$0 |
| Assistant message | 0 | ~$0.001 (rate-limited by plan) |

### Failure Handling

```
Step fails
  → Inngest retries 2× with exponential backoff
  → still failing → try next model in the fallback chain
  → chain exhausted → step marked 'failed' in generation_jobs.progress
  → credits for that step refunded (compensating ledger row)
  → project.status = 'partial' if any other step succeeded, else 'failed'
  → UI shows per-step Retry; generation-failed email sent
```

| Failure | Behavior |
|---|---|
| One model 5xx / rate-limited | Fallback chain, transparent to the user |
| Zod validation fails twice | Retry once with a stricter system prompt, then fall back |
| Seedream fails on 1 of 4 logos | Keep the 3 that succeeded, refund 2 credits |
| Whole branding step fails | Abort downstream steps (they'd be ungrounded), full refund |
| Job exceeds 15 minutes | Inngest cancels, full refund, status `failed` |

---

## 8. Payment & Billing

**Provider**: Polar · **Model**: Merchant of Record · **SDK**: `@polar-sh/nextjs`

### Why Polar over Stripe

Polar buys the product from you and resells it to the customer. Polar is therefore the merchant of record, which means **Polar owes the VAT/GST/sales tax, not you**. For a product selling into the EU, UK, GCC and US simultaneously, this removes the single largest compliance burden a solo team faces — no VAT registration, no MOSS filings, no US nexus tracking.

| | Stripe (v1) | Polar (v2) |
|---|---|---|
| Tax liability | Yours, in every jurisdiction | Polar's |
| Invoicing / receipts | You build it | Hosted, compliant, per-jurisdiction |
| Usage/credit billing | Build on metered prices | First-class Meters + Credits |
| Customer portal | Build or configure | Hosted, one line of code |
| Fee | 2.9% + 30¢ | 4% + 40¢ (includes MoR + tax handling) |

The ~1.1% premium buys tax compliance. That is a good trade at this stage.

### Plans

| Plan | Monthly | Annual | Credits/mo | ≈ Generations | Seats | Features |
|---|---|---|---|---|---|---|
| **Free** | $0 | — | 10 one-time | 1 | 1 | Branding + 4 logos. No website, no social, no vector export. |
| **Basic** | $29 | $290 | 120 | ~15 | 2 | + Website builder, SVG export, brand kit ZIP |
| **Pro** | $79 | $790 | 400 | ~50 | 5 | + Social media kit, Brand Assistant, priority queue |
| **Business** | $199 | $1,990 | 1,200 | ~150 | Unlimited | + Custom domain, API access, dedicated support |

Annual = 10 months' price (2 months free), credits granted monthly, not upfront.

**Unit economics at list price:**

| Plan | Revenue | Max upstream AI cost | Polar fee | Gross margin |
|---|---|---|---|---|
| Basic | $29.00 | $4.65 | $1.56 | **79%** |
| Pro | $79.00 | $15.50 | $3.56 | **76%** |
| Business | $199.00 | $46.50 | $8.36 | **72%** |

> These assume every included credit is spent. Real utilization is typically 40–60%, so effective margins run meaningfully higher.

### Credit Packs

One-off purchases, never expire, consumed only after the monthly grant is exhausted.

| Pack | Price | Credits | $/credit |
|---|---|---|---|
| Small | $15 | 100 | $0.150 |
| Medium | $39 | 300 | $0.130 |
| Large | $110 | 1,000 | $0.110 |

### Credit Precedence

```
spend(n):
  1. Deduct from monthly subscription grant  (expires at period end — use it or lose it)
  2. Then from purchased pack balance        (never expires)
  3. Insufficient → 402, UI offers upgrade or top-up
```

Both are rows in `credit_transactions`; the split is tracked via `reason` and `metadata.source`.

### Checkout Flow

```
1. User clicks Upgrade → createCheckout Server Action
2. Server creates a Polar checkout session with metadata { organizationId }
3. Redirect to Polar-hosted checkout (cards, Apple Pay, Google Pay, local methods)
4. Polar collects payment + the correct tax for the buyer's jurisdiction
5. Redirect to /dashboard/billing?checkout_id=...  (optimistic success UI)
6. Webhook order.paid / subscription.active → authoritative state written to DB
7. Credits granted, revalidateTag(`org:${orgId}`)
```

> Step 5 is UX; step 6 is truth. Never grant credits from the redirect — it is trivially forgeable and fires before payment settles.

### Route Handlers

```ts
// src/app/api/checkout/route.ts
export const GET = Checkout({
  accessToken: env.POLAR_ACCESS_TOKEN,
  successUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
  server: env.POLAR_SERVER,          // 'sandbox' | 'production'
})

// src/app/api/portal/route.ts
export const GET = CustomerPortal({
  accessToken: env.POLAR_ACCESS_TOKEN,
  getCustomerId: async (req) => (await requireOrg(req)).polarCustomerId,
  server: env.POLAR_SERVER,
})

// src/app/api/webhooks/polar/route.ts
export const POST = Webhooks({
  webhookSecret: env.POLAR_WEBHOOK_SECRET,
  onSubscriptionActive:   ({ data }) => billing.activateSubscription(data),
  onSubscriptionUpdated:  ({ data }) => billing.syncSubscription(data),
  onSubscriptionCanceled: ({ data }) => billing.markCancelAtPeriodEnd(data),
  onSubscriptionRevoked:  ({ data }) => billing.downgradeToFree(data),
  onOrderPaid:            ({ data }) => billing.recordOrderAndGrantCredits(data),
  onOrderRefunded:        ({ data }) => billing.reverseOrder(data),
})
```

### Webhook Events

| Event | Handler | Effect |
|---|---|---|
| `subscription.created` | `syncSubscription` | Row created, status `trialing`/`active` |
| `subscription.active` | `activateSubscription` | Status `active`, grant `monthly_credits` |
| `subscription.updated` | `syncSubscription` | Plan change, proration, period roll → grant new period's credits |
| `subscription.canceled` | `markCancelAtPeriodEnd` | `cancel_at_period_end = true`, access continues |
| `subscription.revoked` | `downgradeToFree` | Access ends, unused grant credits expire, packs survive |
| `order.paid` | `recordOrderAndGrantCredits` | Order row + credit grant for packs |
| `order.refunded` | `reverseOrder` | Compensating negative ledger row |

**Every handler is idempotent.** The Polar event ID becomes `credit_transactions.idempotency_key`, so a redelivered webhook cannot double-grant credits.

### Entitlement Checks

Two independent gates, both enforced server-side:

```ts
// 1. Feature access — plan flags
await assertFeature(orgId, 'brand_assistant')   // throws FEATURE_LOCKED → upgrade CTA

// 2. Credit balance — reserve before work, settle after
const reservation = await reserveCredits(orgId, 8, { projectId, idempotencyKey: jobId })
// ... pipeline runs ...
await settleCredits(reservation, actualCreditsUsed)   // refunds the difference
```

> Reserve-then-settle prevents two concurrent generations from both passing a balance check and overdrawing the account.

### Failed Payments

```
invoice fails → subscription.past_due
  → Polar dunning retries (day 1, 3, 5, 7)
  → app stays fully accessible during dunning (never punish a card expiry)
  → in-app banner + email from day 3
  → still failing after retries → subscription.revoked → downgrade to Free
```

---

## 9. Admin Panel

**Access**: `https://brandora.enigmitic.com/en/admin` · requires `users.role = 'admin'` · enforced in middleware **and** in every page and action.

### Sections

| Section | Route | Features |
|---|---|---|
| **Analytics** | `/admin` | Users, orgs, projects, MRR, subscriptions by plan, monthly revenue chart |
| **Users** | `/admin/users` | Search, filter by status, suspend/activate, promote to admin, soft delete, impersonate |
| **Plans** | `/admin/plans` | Create/edit plans, credit grants, feature flags, toggle active, sync to Polar |
| **Projects** | `/admin/projects` | All projects across all orgs, filter by status, inspect generated assets |
| **AI Cost & Margin** | `/admin/ai` | *(new in v2)* Spend, model performance, per-customer profitability |

### AI Cost & Margin Dashboard

Everything here reads from `ai_usage` joined against `credit_transactions` and `subscriptions`. This is the screen that tells you whether the business works.

| Panel | Query | Answers |
|---|---|---|
| **Spend over time** | `SUM(cost_usd)` by day, split by provider | Is AI cost tracking revenue, or outrunning it? |
| **Cost by feature** | `SUM(cost_usd)` grouped by `feature` | Confirms images dominate — and flags it if that ever changes |
| **Cost per generation** | `SUM(cost_usd) / COUNT(DISTINCT generation_job_id)` | Should sit near $0.31. A rise means prompt bloat or retry storms. |
| **Model leaderboard** | Per `model`: calls, avg latency, error rate, avg cost, fallback-trigger rate | Which models are actually earning their slot in the registry |
| **Fallback rate** | `% of ai_usage rows where status='error'` per model | An early warning that a provider is degrading |
| **Margin by org** | `revenue − SUM(cost_usd)` per organization | Finds unprofitable heavy users before they scale |
| **Unprofitable customers** | Orgs where 30-day AI cost > 30-day revenue | The upsell / rate-limit list |
| **Credits outstanding** | `SUM(amount)` across all orgs | Your unrecognized liability |

```sql
-- Cost per generation, last 30 days
SELECT date_trunc('day', created_at) AS day,
       SUM(cost_usd)                                  AS spend,
       COUNT(DISTINCT generation_job_id)              AS generations,
       SUM(cost_usd) / NULLIF(COUNT(DISTINCT generation_job_id), 0) AS cost_per_generation
FROM ai_usage
WHERE created_at > now() - interval '30 days' AND generation_job_id IS NOT NULL
GROUP BY 1 ORDER BY 1;
```

> **Alert**: if `cost_per_generation` exceeds $0.45 for 24h, something is wrong — usually a retry loop or an accidental model change. Wire this to a Sentry alert.

### Impersonation

Better Auth's admin plugin allows an admin to assume a user's session for support. Rules: audit-logged with the admin's ID, read-only for billing actions, hard-expires after 30 minutes, and a persistent red banner is shown while active.

---

## 10. Deployment Guide

Deployment is now a git push. The old browser-based installer, `setup_bridge.php`, and the manual `.htaccess` upload are all gone.

### Prerequisites

| Service | Purpose | Tier to start |
|---|---|---|
| Vercel | Hosting, functions, CDN | Pro (needed for `maxDuration > 300s` and wildcard domains) |
| Neon | Postgres + per-PR branching | Free → Scale |
| Inngest | AI job orchestration | Free (50k runs/mo) |
| Cloudflare R2 | Asset storage | Free (10 GB, zero egress) |
| OpenRouter | All text models | Pay-as-you-go |
| BytePlus ModelArk | Seedream 5.0 images | Pay-as-you-go |
| Polar | Payments (MoR) | 4% + 40¢ |
| Resend | Transactional email | Free (3k/mo) |
| Sentry / PostHog | Errors / product analytics | Free tiers |

### Step 1 — Database

```bash
# Create the Neon project, then locally:
pnpm drizzle-kit generate     # emits SQL into drizzle/
pnpm drizzle-kit migrate      # applies to DATABASE_URL
pnpm db:seed                  # plans + admin user
```

Enable **Neon's Vercel integration** so each preview deployment gets its own database branch automatically.

### Step 2 — Vercel Project

```bash
vercel link
vercel env pull .env.local
```

Set every variable from Section 11 for Production, Preview, and Development. Confirm **Fluid Compute is enabled** (default on new projects) — without it, functions cap at 300s and the Inngest worker can time out mid-pipeline.

### Step 3 — DNS & Domains

The app lives at `brandora.enigmitic.com`; customer sites live at `{customer}.brandora.enigmitic.com`. That wildcard needs an auto-renewing certificate, which requires DNS-01 validation.

**Delegate only the `brandora` subtree to Vercel** — the rest of `enigmitic.com` stays exactly where it is.

At your current DNS host for `enigmitic.com`, add:

```
brandora    NS    ns1.vercel-dns.com.
brandora    NS    ns2.vercel-dns.com.
```

Then in Vercel → Domains, add both:

```
brandora.enigmitic.com        → the app
*.brandora.enigmitic.com      → wildcard for customer sites
```

Vercel now controls DNS for that subtree only, so it can complete DNS-01 challenges and renew the wildcard cert forever without you touching anything. `enigmitic.com`, `www`, `lab`, and MX records are unaffected.

The middleware rewrite maps hostnames to routes:

```ts
const host = req.headers.get('host') ?? ''
const base = 'brandora.enigmitic.com'
if (host.endsWith(`.${base}`) && host !== base) {
  const sub = host.replace(`.${base}`, '')
  return NextResponse.rewrite(new URL(`/sites/${sub}${req.nextUrl.pathname}`, req.url))
}
```

**Customer custom domains** (Business plan): the app calls Vercel's Domains API to attach `theircompany.com` to the project; the customer points a CNAME at `cname.vercel-dns.com`. Vercel issues a per-domain certificate automatically. The domain is stored on `website_assets.custom_domain` and resolved by the same middleware.

### Step 4 — Inngest

```bash
npx inngest-cli@latest dev     # local
```
In production, register the serve endpoint `https://brandora.enigmitic.com/api/inngest` in the Inngest dashboard and set `INNGEST_SIGNING_KEY` / `INNGEST_EVENT_KEY`.

### Step 5 — Polar

1. Create the organization in Polar (sandbox first).
2. Create products matching `plans`: Basic/Pro/Business × monthly + annual, plus three credit packs.
3. Store each `polar_product_id` on the corresponding `plans` row.
4. Add webhook `https://brandora.enigmitic.com/api/webhooks/polar`, subscribe to the events in Section 8, save the secret.
5. Verify a full sandbox purchase before switching `POLAR_SERVER=production`.

### Step 6 — R2

Create the bucket, generate an S3-compatible access key, and set a CORS policy allowing PUT from your domain (for direct client uploads). Attach a public `r2.dev` subdomain or a custom CDN domain for public logo delivery.

### Step 7 — Email

Verify the sending domain in Resend and add the SPF, DKIM, and DMARC records to `enigmitic.com` DNS. Since email DNS lives on the apex, the `brandora` NS delegation from Step 3 does not affect it.

### Step 8 — Deploy

```bash
git push origin main    # Vercel builds and promotes to production
```

### CI Pipeline

```yaml
# .github/workflows/ci.yml
on: [pull_request]
jobs:
  verify:
    steps:
      - pnpm install --frozen-lockfile
      - pnpm typecheck          # tsc --noEmit
      - pnpm lint
      - pnpm test               # vitest
      - pnpm drizzle-kit check  # migration drift detection
      - pnpm build
```

Each PR produces a Vercel preview deploy bound to a fresh Neon branch, so migrations run against an isolated copy of the real schema before merge. The branch is deleted when the PR closes.

---

## 11. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon pooled connection string |
| `DATABASE_URL_UNPOOLED` | ✅ | Direct connection — required for migrations |
| `BETTER_AUTH_SECRET` | ✅ | 32+ random bytes: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | ✅ | `https://brandora.enigmitic.com` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Same — exposed to the browser |
| `GOOGLE_CLIENT_ID` | ✅ | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google Cloud Console |
| `OPENROUTER_API_KEY` | ✅ | All text generation |
| `BYTEPLUS_API_KEY` | ✅ | Seedream 5.0 images |
| `BYTEPLUS_BASE_URL` | ✅ | `https://ark.ap-southeast.bytepluses.com/api/v3` |
| `INNGEST_EVENT_KEY` | ✅ | Job enqueueing |
| `INNGEST_SIGNING_KEY` | ✅ | Verifies inbound worker calls |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare account |
| `R2_ACCESS_KEY_ID` | ✅ | S3-compatible key |
| `R2_SECRET_ACCESS_KEY` | ✅ | S3-compatible secret |
| `R2_BUCKET_NAME` | ✅ | e.g. `brandora-assets` |
| `R2_PUBLIC_URL` | ✅ | Public CDN base for logo delivery |
| `POLAR_ACCESS_TOKEN` | ✅ | Polar API token |
| `POLAR_WEBHOOK_SECRET` | ✅ | Webhook signature verification |
| `POLAR_SERVER` | ✅ | `sandbox` or `production` |
| `RESEND_API_KEY` | ✅ | Transactional email |
| `EMAIL_FROM` | ✅ | e.g. `Brandora <hello@enigmitic.com>` |
| `VERCEL_API_TOKEN` | Custom domains | Attaching customer domains via the Domains API |
| `VERCEL_PROJECT_ID` | Custom domains | Target project |
| `SENTRY_DSN` | Monitoring | Error tracking |
| `SENTRY_AUTH_TOKEN` | Monitoring | Source map upload at build |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics | Product analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | Analytics | e.g. `https://eu.i.posthog.com` |

**Rules**
- Only `NEXT_PUBLIC_*` reaches the browser. Everything else is server-only — a leaked `OPENROUTER_API_KEY` is a directly billable incident.
- All variables are parsed and validated at boot with `@t3-oss/env-nextjs`, so a missing variable fails the build rather than the first request that needs it.

---

## 12. Error Handling

### Error Taxonomy

```ts
// src/lib/errors.ts
export class AppError extends Error {
  constructor(public code: ErrorCode, message: string, public status = 400) { super(message) }
}

type ErrorCode =
  | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION'
  | 'EMAIL_NOT_VERIFIED' | 'NO_ORG'
  | 'INSUFFICIENT_CREDITS' | 'FEATURE_LOCKED' | 'SEAT_LIMIT'
  | 'GENERATION_IN_PROGRESS' | 'AI_PROVIDER_ERROR' | 'RATE_LIMITED'
```

### Surfacing

| Layer | Mechanism | User sees |
|---|---|---|
| Server Action | `next-safe-action` result object | Inline field errors + toast |
| RSC page | `error.tsx` boundary per route segment | Segment-scoped error card with Retry |
| Route Handler | JSON `{ error: { code, message } }` + status | Handled by the caller |
| Inngest worker | Step marked failed, credits refunded | Per-step Retry in the progress UI |
| Uncaught | `global-error.tsx` | Full-page fallback, reported to Sentry |

### HTTP Status Codes

| Code | Meaning | Common cause |
|---|---|---|
| `400` | Bad request | Malformed input |
| `401` | Unauthorized | Missing or expired session cookie |
| `402` | Payment required | `INSUFFICIENT_CREDITS` — UI shows upgrade/top-up |
| `403` | Forbidden | Not an org member, wrong role, or `FEATURE_LOCKED` |
| `404` | Not found | Resource missing or not in the active org |
| `409` | Conflict | Generation already running, or subdomain taken |
| `422` | Unprocessable | Zod validation failed |
| `429` | Too many requests | Auth rate limit or per-plan generation throttle |
| `500` | Server error | Unhandled — check Sentry |

### Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| `'use server'` action returns undefined | Threw before `next-safe-action` wrapping | Confirm the action is built from `orgAction`, not a bare function |
| Session null in a Server Component | `headers()` not awaited | `await auth.api.getSession({ headers: await headers() })` |
| Hydration mismatch on theme or `dir` | Server and client disagree | `suppressHydrationWarning` on `<html>`; resolve locale server-side |
| SSE stream never delivers events | Response buffered by a proxy | Set `X-Accel-Buffering: no` and `Cache-Control: no-transform` |
| Generation stalls at `queued` | Inngest can't reach the serve endpoint | Verify `/api/inngest` is registered and signing keys match |
| Credits deducted on a failed job | Refund step didn't run | Check `onFailure` handler; reconcile via the ledger |
| Credits double-granted | Webhook redelivered | Ensure `idempotency_key` is set from the Polar event ID |
| `FEATURE_LOCKED` on a paid plan | `plans` row flag not set | Toggle the feature flag in `/admin/plans` |
| Logo text is garbled | Prompt missing letter-by-letter spelling | See the logo prompt constraints in Section 7 |
| SVG trace produces noise | Source image had gradients | Enforce "flat vector, solid fills" in the prompt |
| Customer subdomain 404s | Wildcard domain or NS delegation missing | Verify `*.brandora.enigmitic.com` in Vercel and the `brandora` NS records |
| Stale data after a mutation | Missing revalidation | `revalidateTag` in the action; `router.refresh()` after SSE `done` |
| Cost per generation spikes | Retry storm or model misconfiguration | Check the model leaderboard and fallback rate in `/admin/ai` |

---

## Appendix A — Seeded Data

### Plans

| Slug | Name | Monthly | Annual | Credits | Seats | Website | Social | Vector | Assistant | Custom domain |
|---|---|---|---|---|---|---|---|---|---|---|
| `free` | Free | $0 | — | 10 once | 1 | ✗ | ✗ | ✗ | ✗ | ✗ |
| `basic` | Basic | $29 | $290 | 120 | 2 | ✓ | ✗ | ✓ | ✗ | ✗ |
| `pro` | Pro | $79 | $790 | 400 | 5 | ✓ | ✓ | ✓ | ✓ | ✗ |
| `business` | Business | $199 | $1,990 | 1,200 | ∞ | ✓ | ✓ | ✓ | ✓ | ✓ |

### Credit Packs

| Slug | Price | Credits |
|---|---|---|
| `pack_small` | $15 | 100 |
| `pack_medium` | $39 | 300 |
| `pack_large` | $110 | 1,000 |

### Admin User

Seeded from environment variables, never hardcoded:

```bash
SEED_ADMIN_EMAIL=admin@enigmitic.com
SEED_ADMIN_PASSWORD=<generated, changed on first login>
```

> The v1 default of `admin@enigmatic-launchpad.com` / `Admin@123456` was committed to the repository. Do not reintroduce a hardcoded credential.

---

## Appendix B — Key File Reference

| File | Purpose |
|---|---|
| `src/server/db/schema.ts` | All Drizzle table definitions |
| `src/server/auth.ts` | Better Auth configuration |
| `src/server/actions/safe-action.ts` | Action clients — the authorization backbone |
| `src/server/ai/models.ts` | **Model registry — change models here and nowhere else** |
| `src/server/ai/router.ts` | OpenRouter client |
| `src/server/ai/image.ts` | Seedream / BytePlus client |
| `src/server/ai/prompts/` | Versioned prompt templates |
| `src/server/ai/schemas/` | Zod output schemas |
| `src/server/ai/pipeline/generate.ts` | Inngest generation function |
| `src/server/billing/credits.ts` | Reserve / settle / refund ledger logic |
| `src/app/api/webhooks/polar/route.ts` | Polar webhook handlers |
| `src/app/api/generate/[projectId]/stream/route.ts` | SSE progress stream |
| `middleware.ts` | Locale, session redirect, subdomain rewrite |
| `src/lib/env.ts` | Validated environment variables |
| `drizzle.config.ts` | Migration configuration |

---

## Appendix C — Migration from v1

### Data Migration (MySQL → Postgres)

| v1 table | v2 destination | Transformation |
|---|---|---|
| `users` | `users` + `organizations` + `members` | Each user gets a personal org; they become its `owner` |
| `plans` | `plans` | `generations_limit` → `monthly_credits` (× 8 credits per generation) |
| `subscriptions` | `subscriptions` | Stripe IDs cannot transfer — customers must re-subscribe through Polar |
| `projects` | `projects` | `user_id` → `organization_id` (the personal org) |
| `branding_assets` | `branding_assets` | JSON columns → JSONB; DALL·E URLs re-hosted to R2 (they expire) |
| `website_assets` | `website_assets` | `pages` object → typed block arrays (see Section 5) |
| `social_media_assets` | `social_media_assets` | Direct copy |
| `invoices` | `orders` | Historical record only; Polar owns all new billing |

**Non-negotiable steps**
1. **Download every DALL·E image before migrating.** Those URLs expire — the assets are already at risk today.
2. **Passwords do not transfer.** Laravel bcrypt hashes are not compatible with Better Auth's Argon2id. Email every existing user a password-reset link at cutover, or verify them via Google OAuth.
3. **Stripe subscriptions cannot be ported to Polar.** Run both in parallel: let existing Stripe subscriptions expire naturally while all new signups go to Polar. Grandfather existing customers on their current pricing.
4. **Convert website content to blocks.** Write a one-off script mapping v1's `{home: {hero_title, hero_subtitle, ...}}` shape onto the v2 block array. Anything unmapped becomes a generic `text` block rather than being dropped.

### Suggested Build Order

| Phase | Scope |
|---|---|
| 1 | Next.js scaffold, Drizzle schema, Better Auth, org model, seed data |
| 2 | Onboarding wizard, projects CRUD, dashboard shell, i18n + RTL |
| 3 | AI pipeline: model registry, prompts, Inngest, SSE progress, credits ledger |
| 4 | Logos: Seedream, vectorization, brand kit ZIP |
| 5 | Website builder blocks, published site rendering, subdomains |
| 6 | Polar billing, plans, credit packs, webhooks |
| 7 | Brand Assistant |
| 8 | Admin panel + AI cost dashboard |
| 9 | Data migration, cutover, Stripe wind-down |

---

*Brandora — System Documentation v2.0 · Next.js 16 · Last updated 2026-08-02*
