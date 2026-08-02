# Brandora

AI-powered brand identity generation. Next.js 16 full-stack.

See [`SYSTEM_DOCUMENTATION.md`](./SYSTEM_DOCUMENTATION.md) for the complete architecture,
database schema, AI model registry, and deployment guide.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, RSC, Server Actions) |
| Database | Postgres (Neon) + Drizzle ORM |
| Auth | Better Auth + organization plugin |
| AI — text | OpenRouter → DeepSeek V4 Pro · Qwen3.7 · GLM-5.2 |
| AI — images | BytePlus ModelArk → Seedream 5.0 Pro |
| Jobs | Inngest |
| Storage | Cloudflare R2 |
| Payments | Polar (Merchant of Record) |

## Requirements

- Node.js >= 20.9
- pnpm (`corepack enable`)
- A Postgres database (Neon recommended)

## Setup

```bash
pnpm install
cp .env.example .env
```

Fill in at minimum:

```bash
DATABASE_URL="postgresql://…"          # Neon pooled
DATABASE_URL_UNPOOLED="postgresql://…" # Neon direct — used for migrations
BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Then apply the schema and seed plans:

```bash
pnpm db:migrate   # apply migrations
pnpm db:seed      # plans + credit packs
pnpm dev
```

## Making yourself an admin

There is no default admin credential in this repo by design. Sign up through the
app normally, then:

```bash
SEED_ADMIN_EMAIL="you@example.com" pnpm db:seed
```

This promotes that existing account to `role = 'admin'`. Password hashing always
stays owned by Better Auth.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate SQL migrations from the Drizzle schema |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:push` | Push schema directly (dev only — skips migration files) |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm db:seed` | Seed plans, credit packs, admin promotion |

## Project layout

```
src/
├── app/                  Routes (App Router)
│   └── api/auth/[...all] Better Auth handler
├── server/               Server-only. The only place that touches the DB.
│   ├── db/               Drizzle schema, client, seed
│   ├── actions/          Server Actions + the safe-action clients
│   ├── auth.ts           Better Auth config
│   └── session.ts        RSC session helpers
└── lib/                  Isomorphic utils, env, errors, auth client
```

### Two rules worth internalizing

1. **`src/server/` is the only DB boundary.** Route handlers and Server Actions call
   services; services call queries.
2. **Server Actions are public HTTP endpoints.** Never build one from the bare
   `actionClient` — start from `orgAction`, `orgAdminAction`, or `adminAction` so the
   session and membership checks cannot be skipped.

## Build status

Phase 1 complete: scaffold, schema (22 tables), Better Auth with organizations,
action-client authorization layer, and seed data. See Appendix C of the system
documentation for the remaining phases.
