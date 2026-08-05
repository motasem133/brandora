import 'dotenv/config'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Deployment preflight.
 *
 * Answers one question — "would this deployment actually work?" — by checking
 * the things that are invisible until a customer hits them: an unapplied
 * migration, a plan with no Polar product behind it, a PostHog key with no
 * host to send to, sandbox billing left switched on in production.
 *
 * Every check reads. Nothing here writes, migrates or seeds, so it is safe to
 * point at production.
 *
 *   pnpm preflight                  # against whatever .env points at
 *   pnpm preflight --production     # apply the stricter production rules
 *   pnpm preflight --services       # also call R2, Polar and Resend
 */

const args = new Set(process.argv.slice(2))
const CHECK_SERVICES = args.has('--services')
const PRODUCTION =
  args.has('--production') ||
  process.env.VERCEL_ENV === 'production' ||
  process.env.NODE_ENV === 'production'

const green = (s) => `\x1b[32m${s}\x1b[0m`
const yellow = (s) => `\x1b[33m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`
const bold = (s) => `\x1b[1m${s}\x1b[0m`
const dim = (s) => `\x1b[2m${s}\x1b[0m`

let passed = 0
const problems = []

function section(title) {
  console.log(`\n${bold(title)}`)
}

/** `status` is 'pass' | 'warn' | 'fail'. A warn never fails the run. */
function report(status, name, detail = '') {
  const suffix = detail ? ` ${dim('— ' + detail)}` : ''

  if (status === 'pass') {
    passed++
    console.log(`  ${green('✓')} ${name}${suffix}`)
    return
  }

  const mark = status === 'fail' ? red('✗') : yellow('!')
  console.log(`  ${mark} ${name}${suffix}`)
  problems.push({ status, name, detail })
}

const present = (key) => Boolean(process.env[key]?.trim())

/**
 * A variable that some feature needs.
 *
 * Missing in production is a failure; missing in development is worth saying
 * once and moving on, because half of these are deliberately unset locally.
 */
function requireEnv(key, purpose, { productionOnly = true } = {}) {
  if (present(key)) return report('pass', key, purpose)
  report(PRODUCTION || !productionOnly ? 'fail' : 'warn', key, `not set — ${purpose}`)
}

function hostOf(value) {
  try {
    return new URL(value).host
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ env --- */

function checkEnvironment() {
  section(`Environment ${dim(PRODUCTION ? '(production rules)' : '(development rules)')}`)

  for (const [key, purpose] of [
    ['DATABASE_URL', 'every request reads it'],
    ['BETTER_AUTH_URL', 'sessions are issued against it'],
    ['NEXT_PUBLIC_APP_URL', 'links and redirects are built from it'],
  ]) {
    if (present(key)) report('pass', key, purpose)
    else report('fail', key, `not set — ${purpose}`)
  }

  const secret = process.env.BETTER_AUTH_SECRET ?? ''
  if (secret.length >= 32) report('pass', 'BETTER_AUTH_SECRET', 'long enough')
  else report('fail', 'BETTER_AUTH_SECRET', `${secret.length} chars, needs 32+`)

  if (present('DATABASE_URL_UNPOOLED')) {
    report('pass', 'DATABASE_URL_UNPOOLED', 'migrations have a direct connection')
  } else {
    report('warn', 'DATABASE_URL_UNPOOLED', 'not set — poolers reject some DDL, so migrations may fail')
  }

  /*
   * Better Auth validates the request Origin against its own baseURL, so a
   * mismatch here does not degrade anything — it refuses every sign-in.
   */
  const authHost = hostOf(process.env.BETTER_AUTH_URL ?? '')
  const appHost = hostOf(process.env.NEXT_PUBLIC_APP_URL ?? '')
  if (authHost && appHost && authHost === appHost) {
    report('pass', 'app and auth URLs agree', authHost)
  } else if (authHost && appHost) {
    report('fail', 'app and auth URLs disagree', `${appHost} vs ${authHost} — every sign-in is refused`)
  }

  if (PRODUCTION && appHost) {
    const local = appHost.startsWith('localhost') || appHost.startsWith('127.')
    const https = (process.env.NEXT_PUBLIC_APP_URL ?? '').startsWith('https://')
    if (local) report('fail', 'app URL is a real host', `${appHost} is local`)
    else if (!https) report('fail', 'app URL is https', appHost)
    else report('pass', 'app URL is a real https host', appHost)
  }

  section('Services')

  requireEnv('OPENROUTER_API_KEY', 'all text generation')
  requireEnv('FAL_KEY', 'logo images')
  requireEnv('INNGEST_EVENT_KEY', 'generation jobs are enqueued with it')
  requireEnv('INNGEST_SIGNING_KEY', 'inbound worker calls are verified with it')

  if (PRODUCTION && present('INNGEST_DEV')) {
    report('fail', 'INNGEST_DEV', 'set in production — jobs would run against the dev server')
  } else if (present('INNGEST_DEV')) {
    report('pass', 'INNGEST_DEV', 'local dev mode')
  }

  for (const key of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME']) {
    requireEnv(key, 'asset storage')
  }

  if (present('R2_PUBLIC_URL')) {
    report('pass', 'R2_PUBLIC_URL', 'assets served from a CDN domain')
  } else {
    report('warn', 'R2_PUBLIC_URL', 'not set — every image goes through the signed /api/files route')
  }

  requireEnv('POLAR_ACCESS_TOKEN', 'checkout')
  requireEnv('POLAR_WEBHOOK_SECRET', 'webhook signatures are verified with it')

  const polarServer = process.env.POLAR_SERVER ?? 'sandbox'
  if (PRODUCTION && polarServer !== 'production') {
    report('fail', 'POLAR_SERVER', `${polarServer} in production — real customers would hit test checkout`)
  } else {
    report('pass', 'POLAR_SERVER', polarServer)
  }

  requireEnv('RESEND_API_KEY', 'password resets and verification email')

  const from = process.env.EMAIL_FROM ?? ''
  if (from.includes('resend.dev')) {
    report('fail', 'EMAIL_FROM', 'resend.dev only delivers to the Resend account owner')
  } else if (from) {
    report('pass', 'EMAIL_FROM', from)
  } else {
    report('warn', 'EMAIL_FROM', 'not set — the default is used')
  }

  section('Optional but worth knowing')

  const google = present('GOOGLE_CLIENT_ID') && present('GOOGLE_CLIENT_SECRET')
  report(
    google ? 'pass' : 'warn',
    'Google sign-in',
    google ? 'configured' : 'not configured — the sign-in button is hidden, so nothing is broken',
  )

  report(
    present('NEXT_PUBLIC_SENTRY_DSN') ? 'pass' : 'warn',
    'Sentry',
    present('NEXT_PUBLIC_SENTRY_DSN') ? 'errors are reported' : 'not configured — production errors go unrecorded',
  )

  if (present('NEXT_PUBLIC_POSTHOG_KEY') && !present('NEXT_PUBLIC_POSTHOG_HOST')) {
    // The /ingest rewrite is built from the host; without it the tunnel 404s.
    report('fail', 'PostHog', 'key set without NEXT_PUBLIC_POSTHOG_HOST — every event 404s at /ingest')
  } else if (present('NEXT_PUBLIC_POSTHOG_KEY')) {
    report('pass', 'PostHog', 'analytics are recorded')
  } else {
    report('warn', 'PostHog', 'not configured — no product analytics')
  }
}

/* ------------------------------------------------------------- database --- */

async function checkDatabase(sql) {
  section('Migrations')

  const journal = JSON.parse(fs.readFileSync(path.join('drizzle', 'meta', '_journal.json'), 'utf8'))

  let applied
  try {
    applied = await sql`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id`
  } catch {
    report('fail', 'migrations table', 'missing — the database has never been migrated')
    return
  }

  const appliedHashes = new Set(applied.map((row) => String(row.hash)))
  const pending = []
  let changed = 0

  for (const entry of journal.entries) {
    const file = path.join('drizzle', `${entry.tag}.sql`)
    // Drizzle records the sha256 of the file, so an edited migration is
    // detectable as well as a missing one.
    const hash = crypto.createHash('sha256').update(fs.readFileSync(file, 'utf8')).digest('hex')

    if (appliedHashes.has(hash)) continue
    if (applied.length > entry.idx) changed++
    else pending.push(entry.tag)
  }

  if (pending.length === 0 && changed === 0) {
    report('pass', 'schema is up to date', `${journal.entries.length} migrations applied`)
  }

  if (pending.length > 0) {
    report('fail', 'migrations pending', `${pending.join(', ')} — run pnpm drizzle-kit migrate`)
  }

  if (changed > 0) {
    report('fail', 'applied migrations were edited', `${changed} file(s) no longer match what ran`)
  }

  section('Plans and billing')

  const plans = await sql`SELECT slug, name, price_monthly, price_yearly, is_active,
    polar_product_id_monthly, polar_product_id_yearly, custom_domain FROM plans ORDER BY sort_order`

  if (plans.length === 0) {
    report('fail', 'plans', 'no rows — run pnpm db:seed')
    return { plans }
  }

  report('pass', 'plans seeded', `${plans.length} plans`)

  for (const plan of plans.filter((p) => p.price_monthly > 0 && p.is_active)) {
    if (plan.polar_product_id_monthly) {
      report('pass', `${plan.name} — monthly`, 'connected to Polar')
    } else {
      report('fail', `${plan.name} — monthly`, 'no Polar product, so it cannot be bought')
    }

    if (plan.price_yearly > 0 && !plan.polar_product_id_yearly) {
      report('warn', `${plan.name} — yearly`, 'priced but not connected, so annual is offered as unavailable')
    } else if (plan.price_yearly > 0) {
      report('pass', `${plan.name} — yearly`, 'connected to Polar')
    }
  }

  const packs = await sql`SELECT slug, polar_product_id FROM credit_packs WHERE is_active = true`
  const unconnectedPacks = packs.filter((pack) => !pack.polar_product_id)
  if (packs.length === 0) report('fail', 'credit packs', 'no rows — run pnpm db:seed')
  else if (unconnectedPacks.length > 0) {
    report('fail', 'credit packs', `${unconnectedPacks.map((p) => p.slug).join(', ')} not connected to Polar`)
  } else report('pass', 'credit packs connected', `${packs.length} packs`)

  section('Data')

  const [admins] = await sql`SELECT count(*)::int AS n FROM users WHERE role = 'admin'`
  if (admins.n > 0) report('pass', 'admin account exists', `${admins.n}`)
  else report('warn', 'no admin account', 'set SEED_ADMIN_EMAIL and run pnpm db:seed to promote one')

  // A plan that sells custom domains needs the credentials to attach them.
  const sellsDomains = plans.some((plan) => plan.custom_domain && plan.is_active)
  if (sellsDomains && !(present('VERCEL_API_TOKEN') && present('VERCEL_PROJECT_ID'))) {
    report('warn', 'custom domains', 'sold on a plan, but VERCEL_API_TOKEN/VERCEL_PROJECT_ID are unset')
  } else if (sellsDomains) {
    report('pass', 'custom domains', 'credentials present')
  }

  const [drift] = await sql`
    SELECT count(*)::int AS n FROM (
      SELECT o.id FROM organizations o
      LEFT JOIN credit_transactions ct ON ct.organization_id = o.id
      GROUP BY o.id, o.credit_balance
      HAVING o.credit_balance <> COALESCE(SUM(ct.amount), 0)::int
    ) drifting`

  if (drift.n === 0) report('pass', 'credit balances match the ledger')
  else report('fail', 'credit balances drifted', `${drift.n} organization(s)`)
}

/* ------------------------------------------------------------- services --- */

async function checkServices() {
  section('Service credentials')

  if (present('POLAR_ACCESS_TOKEN')) {
    const base =
      (process.env.POLAR_SERVER ?? 'sandbox') === 'production'
        ? 'https://api.polar.sh'
        : 'https://sandbox-api.polar.sh'

    try {
      const response = await fetch(`${base}/v1/products/?limit=1`, {
        headers: { Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}` },
      })
      if (response.ok) report('pass', 'Polar token accepted', base)
      else report('fail', 'Polar token rejected', `${response.status} from ${base}`)
    } catch (error) {
      report('fail', 'Polar unreachable', error.message)
    }
  }

  if (present('RESEND_API_KEY')) {
    try {
      const response = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      })

      const payload = await response.clone().json().catch(() => ({}))

      /*
       * A sending-only key cannot list domains and answers 401. That is a
       * correctly scoped key, not a broken one — reporting it as a failure
       * would train people to ignore this output.
       */
      if (payload?.name === 'restricted_api_key') {
        report('pass', 'Resend key accepted', 'sending-only scope')
        report('warn', 'sending domain unverified', 'a sending-only key cannot list domains — check it in Resend')
      } else if (!response.ok) {
        report('fail', 'Resend key rejected', `${response.status} ${payload?.name ?? ''}`.trim())
      } else {
        const body = await response.json()
        const domains = body.data ?? []
        const from = (process.env.EMAIL_FROM ?? '').split('@').pop()?.replace('>', '').trim()
        const match = domains.find((d) => from?.endsWith(d.name))

        if (!from) report('warn', 'Resend', 'no EMAIL_FROM to check against')
        else if (!match) report('fail', 'sending domain not in Resend', `${from} — mail will not deliver`)
        else if (match.status !== 'verified') {
          report('fail', 'sending domain not verified', `${match.name} is ${match.status}`)
        } else report('pass', 'sending domain verified', match.name)
      }
    } catch (error) {
      report('fail', 'Resend unreachable', error.message)
    }
  }

  if (present('R2_ACCOUNT_ID') && present('R2_ACCESS_KEY_ID')) {
    try {
      const { HeadBucketCommand, S3Client } = await import('@aws-sdk/client-s3')
      const client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      })
      await client.send(new HeadBucketCommand({ Bucket: process.env.R2_BUCKET_NAME }))
      report('pass', 'R2 bucket reachable', process.env.R2_BUCKET_NAME)
    } catch (error) {
      report('fail', 'R2 bucket unreachable', error.message)
    }
  }

  if (present('VERCEL_API_TOKEN') && present('VERCEL_PROJECT_ID')) {
    try {
      const team = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : ''
      const response = await fetch(
        `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}${team}`,
        { headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` } },
      )
      if (response.ok) report('pass', 'Vercel project reachable', 'custom domains can be attached')
      else report('fail', 'Vercel project unreachable', String(response.status))
    } catch (error) {
      report('fail', 'Vercel unreachable', error.message)
    }
  }
}

/* ----------------------------------------------------------------- main --- */

async function main() {
  console.log(bold('\nBrandora preflight'))
  console.log(dim(`  ${PRODUCTION ? 'production' : 'development'} rules · ${CHECK_SERVICES ? 'with' : 'without'} service checks`))

  checkEnvironment()

  if (present('DATABASE_URL')) {
    const { default: postgres } = await import('postgres')
    const sql = postgres(process.env.DATABASE_URL, { max: 2, connect_timeout: 10 })

    try {
      await sql`SELECT 1`
      report('pass', 'database reachable', new URL(process.env.DATABASE_URL).host)
      await checkDatabase(sql)
    } catch (error) {
      report('fail', 'database unreachable', error.message)
    } finally {
      await sql.end({ timeout: 5 })
    }
  }

  if (CHECK_SERVICES) await checkServices()

  const failures = problems.filter((p) => p.status === 'fail')
  const warnings = problems.filter((p) => p.status === 'warn')

  section('Result')
  console.log(
    `  ${green(`${passed} ready`)}  ${warnings.length ? yellow(`${warnings.length} worth knowing`) : `${warnings.length} worth knowing`}  ${failures.length ? red(`${failures.length} blocking`) : '0 blocking'}`,
  )

  if (failures.length > 0) {
    console.log(`\n${bold('Blocking')}`)
    for (const failure of failures) console.log(`  ${red('✗')} ${failure.name}${failure.detail ? ` — ${failure.detail}` : ''}`)
  }

  if (!CHECK_SERVICES) {
    console.log(dim('\n  Credentials were not tried. Add --services to call Polar, Resend, R2 and Vercel.'))
  }

  process.exit(failures.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(red(`\npreflight crashed: ${error.message}`))
  process.exit(1)
})
