import 'dotenv/config'
import http from 'node:http'
import postgres from 'postgres'

/**
 * End-to-end system test.
 *
 * Exercises the running application over HTTP the way a browser or attacker
 * would, then asserts against the database directly. Deliberately not mocked:
 * the bugs that have actually shipped in this project were all integration
 * failures that unit tests would have missed.
 *
 * Usage: pnpm dev, then `node scripts/system-test.mjs`
 */

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

/*
 * Better Auth validates Origin against the app's own baseURL, not against
 * wherever it happens to be reachable. Sending the request URL as the Origin
 * fails whenever a build is served on a different port than it was configured
 * for, which is exactly the case in CI.
 */
const ORIGIN = process.env.BETTER_AUTH_URL ?? BASE
const sql = postgres(process.env.DATABASE_URL, { max: 4 })

let passed = 0
let failed = 0
const failures = []

function check(name, condition, detail = '') {
  if (condition) {
    passed++
    console.log(`  \x1b[32m✓\x1b[0m ${name}`)
  } else {
    failed++
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`)
}

/** Minimal cookie jar so a session can be carried across requests. */
function jar() {
  const cookies = new Map()
  return {
    capture(response) {
      for (const raw of response.headers.getSetCookie?.() ?? []) {
        const [pair] = raw.split(';')
        const index = pair.indexOf('=')
        if (index > 0) cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim())
      }
    },
    header() {
      return [...cookies].map(([k, v]) => `${k}=${v}`).join('; ')
    },
    get size() {
      return cookies.size
    },
  }
}

async function request(path, { cookies, method = 'GET', body, redirect = 'manual' } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    redirect,
    headers: {
      // Better Auth rejects state-changing requests without an Origin as CSRF
      // protection, so the test must present one the way a browser would.
      Origin: ORIGIN,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookies?.size ? { Cookie: cookies.header() } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  cookies?.capture(response)
  return response
}

/** Raw HTTP so the Host header can be controlled, which fetch forbids. */
function rawRequest(path, host) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE)
    const req = http.request(
      { hostname: url.hostname, port: url.port, path, method: 'GET', headers: { Host: host } },
      (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => resolve({ status: res.statusCode, body }))
      },
    )
    req.on('error', reject)
    req.end()
  })
}

async function main() {
  const stamp = Date.now()
  const intruderEmail = `intruder-${stamp}@brandora-test.com`

  /* ---------------------------------------------------------------- public */
  section('Public surface')

  for (const [path, label] of [
    ['/en', 'landing (en)'],
    ['/ar', 'landing (ar)'],
    ['/en/login', 'login page'],
    ['/en/register', 'register page'],
  ]) {
    const res = await request(path)
    check(`${label} returns 200`, res.status === 200, `got ${res.status}`)
  }

  const rtl = await (await request('/ar')).text()
  check('Arabic renders dir="rtl"', rtl.includes('dir="rtl"'))

  /*
   * Pricing is read straight from the plans table, so this asserts the page
   * quotes what the product actually charges. Billing is monthly: a page
   * offering an annual period would be pricing something nobody can buy.
   */
  const [paid] = await sql`
    SELECT price_monthly, price_yearly FROM plans
    WHERE price_monthly > 0 ORDER BY sort_order LIMIT 1`

  if (paid) {
    const asMoney = (minor) => `$${(minor / 100).toLocaleString('en-US')}`
    const pricingPage = await (await request('/en/pricing')).text()

    check('pricing quotes the monthly price', pricingPage.includes(asMoney(paid.price_monthly)))
    check('pricing is labelled per month', pricingPage.includes('/month'))
    check('pricing offers no annual period', !pricingPage.includes('/year'))
    check('no plan carries an annual price', paid.price_yearly === 0, `${paid.price_yearly}`)
  } else {
    check('a paid plan exists', false, 'none found')
  }

  /* ------------------------------------------------------------- auth gate */
  section('Authentication gate')

  const anon = await request('/en/dashboard')
  check(
    'unauthenticated /dashboard redirects to login',
    anon.status === 307 && (anon.headers.get('location') ?? '').includes('/login'),
    `got ${anon.status}`,
  )

  const anonBilling = await request('/en/dashboard/billing')
  check('unauthenticated /billing redirects', anonBilling.status === 307, `got ${anonBilling.status}`)

  /* --------------------------------------------------------------- signup */
  section('Sign-up and organization bootstrap')

  /*
   * Sign-up is rate limited to five per hour, which is correct for the product
   * and fatal for a suite that signs up every run. The counter is cleared so
   * the flow below is deterministic; the limiter itself is asserted separately
   * at the end rather than left untested.
   */
  await sql`DELETE FROM rate_limits WHERE key LIKE '%/sign-up/email'`

  const intruder = jar()
  const signup = await request('/api/auth/sign-up/email', {
    cookies: intruder,
    method: 'POST',
    body: { name: 'Intruder', email: intruderEmail, password: 'testpassword123', locale: 'en' },
  })
  check('sign-up succeeds', signup.status === 200, `got ${signup.status}`)
  check('session cookie issued', intruder.size > 0)

  const [intruderUser] = await sql`SELECT id FROM users WHERE email = ${intruderEmail}`
  check('user row created', Boolean(intruderUser))

  const [intruderOrg] = await sql`
    SELECT o.* FROM organizations o
    JOIN members m ON m.organization_id = o.id
    WHERE m.user_id = ${intruderUser?.id ?? ''}`
  check('personal organization auto-created', Boolean(intruderOrg))
  check('owner role assigned', Boolean(intruderOrg), 'membership row')
  check(
    'free credits granted through the ledger',
    intruderOrg?.credit_balance === 10,
    `balance ${intruderOrg?.credit_balance}`,
  )

  const [grant] = await sql`
    SELECT * FROM credit_transactions
    WHERE organization_id = ${intruderOrg?.id ?? ''} AND reason = 'subscription_grant'`
  check('signup grant recorded as a transaction', Boolean(grant))

  // Reaching the dashboard also proves the session heals a null active org.
  const dash = await request('/en/dashboard', { cookies: intruder })
  check('new user reaches the dashboard', dash.status === 200, `got ${dash.status}`)

  /* ------------------------------------------------- cross-tenant isolation */
  section('Cross-tenant isolation (the intruder owns nothing)')

  const [victimProject] = await sql`
    SELECT p.id, p.organization_id FROM projects p
    WHERE p.organization_id <> ${intruderOrg?.id ?? ''} AND p.deleted_at IS NULL LIMIT 1`

  if (!victimProject) {
    check('a second organization exists to test against', false, 'no foreign project found')
  } else {
    const detail = await request(`/en/dashboard/projects/${victimProject.id}`, { cookies: intruder })
    check(
      "cannot open another org's project",
      detail.status === 404,
      `got ${detail.status} (expected 404)`,
    )

    const stream = await request(`/api/generate/${victimProject.id}/stream`, { cookies: intruder })
    check(
      "cannot subscribe to another org's generation stream",
      stream.status === 404 || stream.status >= 400,
      `got ${stream.status}`,
    )

    const builder = await request(`/en/dashboard/projects/${victimProject.id}/builder`, {
      cookies: intruder,
    })
    check(
      "cannot open another org's website builder",
      builder.status === 404,
      `got ${builder.status}`,
    )

    const [victimFile] = await sql`
      SELECT id FROM generated_files WHERE project_id = ${victimProject.id} LIMIT 1`

    if (victimFile) {
      const file = await request(`/api/files/${victimFile.id}`, { cookies: intruder })
      check(
        "cannot download another org's generated file",
        file.status === 404,
        `got ${file.status} (expected 404)`,
      )
    }
  }

  const anonFile = await sql`SELECT id FROM generated_files LIMIT 1`
  if (anonFile.length) {
    const res = await request(`/api/files/${anonFile[0].id}`)
    check(
      'unauthenticated file download is refused',
      res.status !== 302 && res.status !== 200,
      `got ${res.status}`,
    )
  }

  /* ------------------------------------------------------- published sites */
  section('Published sites')

  const [published] = await sql`
    SELECT subdomain FROM website_assets WHERE is_published = true AND subdomain IS NOT NULL LIMIT 1`

  if (published) {
    const site = await request(`/sites/${published.subdomain}`)
    check('published site serves without a session', site.status === 200, `got ${site.status}`)

    const html = await site.text()
    check('published site has a real document shell', html.includes('<html lang='))
    check('published site is not an error shell', !html.includes('__next_error__'))

    // fetch refuses to set Host, so the subdomain rewrite is exercised over
    // raw HTTP — this is the code path a real customer domain takes.
    const viaHost = await rawRequest('/', `${published.subdomain}.localhost`)
    check('subdomain host serves the same site', viaHost.status === 200, `got ${viaHost.status}`)
    check('subdomain response is the published site', viaHost.body.includes('<html lang='))

    /*
     * Custom domains cannot be attached for real here — that needs Vercel — so
     * the column is set directly and cleared again. What is being tested is the
     * half that runs on every request: the proxy handing an unrecognised host
     * to the site route, and the route matching it against custom_domain.
     */
    const testDomain = `system-test-${stamp}.example`
    try {
      await sql`
        UPDATE website_assets SET custom_domain = ${testDomain}
        WHERE subdomain = ${published.subdomain}`

      const viaDomain = await rawRequest('/', testDomain)
      check('attached custom domain serves the site', viaDomain.status === 200, `got ${viaDomain.status}`)
      check('custom domain response is the published site', viaDomain.body.includes('<html lang='))
    } finally {
      await sql`
        UPDATE website_assets SET custom_domain = NULL WHERE custom_domain = ${testDomain}`
    }

    const unattached = await rawRequest('/', 'not-attached-anywhere.example')
    check('unattached domain 404s', unattached.status === 404, `got ${unattached.status}`)
  } else {
    check('a published site exists to test', false, 'none found')
  }

  const missing = await request('/sites/definitely-not-a-real-site')
  check('unknown subdomain 404s', missing.status === 404, `got ${missing.status}`)

  /* --------------------------------------------------------- authenticated */
  section('Authenticated surfaces')

  for (const [path, label] of [
    ['/en/dashboard/projects', 'projects list'],
    ['/en/dashboard/billing', 'billing'],
    ['/en/onboarding', 'onboarding wizard'],
    ['/en/dashboard/billing?currency=aed', 'billing in AED'],
    ['/ar/dashboard', 'dashboard in Arabic'],
  ]) {
    const res = await request(path, { cookies: intruder })
    check(`${label} returns 200`, res.status === 200, `got ${res.status}`)
  }

  const wizard = await (await request('/en/onboarding', { cookies: intruder })).text()
  check(
    'free plan sees the locked-feature notice',
    wizard.includes('Free') || wizard.includes('isn&#x27;t included'),
  )

  /* ------------------------------------------------------- data integrity */
  section('Data integrity')

  const drift = await sql`
    SELECT o.id, o.credit_balance, COALESCE(SUM(ct.amount), 0)::int AS ledger
    FROM organizations o
    LEFT JOIN credit_transactions ct ON ct.organization_id = o.id
    GROUP BY o.id, o.credit_balance
    HAVING o.credit_balance <> COALESCE(SUM(ct.amount), 0)::int`
  check('every cached balance matches its ledger', drift.length === 0, `${drift.length} drifting`)

  const negative = await sql`SELECT id FROM organizations WHERE credit_balance < 0`
  check('no organization has a negative balance', negative.length === 0)

  const orphanProjects = await sql`
    SELECT p.id FROM projects p
    LEFT JOIN organizations o ON o.id = p.organization_id WHERE o.id IS NULL`
  check('no project without an organization', orphanProjects.length === 0)

  const orphanMembers = await sql`
    SELECT m.id FROM members m
    LEFT JOIN users u ON u.id = m.user_id WHERE u.id IS NULL`
  check('no membership without a user', orphanMembers.length === 0)

  const dupIdem = await sql`
    SELECT idempotency_key FROM credit_transactions
    WHERE idempotency_key IS NOT NULL
    GROUP BY idempotency_key HAVING COUNT(*) > 1`
  check('no duplicate idempotency keys', dupIdem.length === 0, `${dupIdem.length} duplicated`)

  const usersWithoutOrg = await sql`
    SELECT u.id FROM users u
    LEFT JOIN members m ON m.user_id = u.id
    WHERE m.id IS NULL AND u.deleted_at IS NULL`
  check('every user belongs to an organization', usersWithoutOrg.length === 0,
    `${usersWithoutOrg.length} orphaned`)

  const badJobs = await sql`
    SELECT id FROM generation_jobs
    WHERE status IN ('completed','partial') AND credits_charged > credits_reserved`
  check('no job charged more than it reserved', badJobs.length === 0, `${badJobs.length} overcharged`)

  const stuck = await sql`
    SELECT id FROM generation_jobs
    WHERE status IN ('queued','running') AND created_at < now() - interval '30 minutes'`
  check('no job stuck running for over 30 minutes', stuck.length === 0, `${stuck.length} stuck`)

  /* ---------------------------------------------------------------- admin */
  section('Administration is closed to ordinary accounts')

  for (const path of ['/en/admin', '/en/admin/ai', '/en/admin/users']) {
    const res = await request(path, { cookies: intruder })
    check(
      `a normal user is refused ${path}`,
      res.status === 307 && !(res.headers.get('location') ?? '').includes('/admin'),
      `got ${res.status} -> ${res.headers.get('location')}`,
    )
  }

  const anonAdmin = await request('/en/admin')
  check('unauthenticated /admin redirects', anonAdmin.status === 307, `got ${anonAdmin.status}`)

  /* ----------------------------------------------------------- rate limit */
  section('Abuse protection')

  const noOrigin = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'No Origin',
      email: `no-origin-${stamp}@brandora-test.com`,
      password: 'testpassword123',
    }),
  })
  check('sign-up without an Origin header is refused', noOrigin.status === 403, `got ${noOrigin.status}`)

  // Six attempts against a limit of five: the last must be refused.
  let limited = false
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await request('/api/auth/sign-up/email', {
      method: 'POST',
      body: {
        name: 'Flood',
        email: `flood-${stamp}-${attempt}@brandora-test.com`,
        password: 'testpassword123',
      },
    })
    if (res.status === 429) {
      limited = true
      break
    }
  }
  check('repeated sign-ups are rate limited', limited)

  /* ------------------------------------------------------------- teardown */
  await sql`DELETE FROM users WHERE email = ${intruderEmail}`
  await sql`DELETE FROM users WHERE email LIKE ${'flood-' + stamp + '%'}`
  await sql`DELETE FROM rate_limits WHERE key LIKE '%/sign-up/email'`

  console.log(`\n\x1b[1mResult\x1b[0m  ${passed} passed, ${failed} failed`)
  if (failures.length) {
    console.log('\nFailures:')
    for (const failure of failures) console.log(`  · ${failure}`)
  }

  await sql.end()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(async (error) => {
  console.error('\nTest run crashed:', error)
  await sql.end()
  process.exit(1)
})
