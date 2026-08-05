import 'dotenv/config'
import crypto from 'node:crypto'
import postgres from 'postgres'

/**
 * Billing system test: subscriptions, plan changes, credits and orders.
 *
 * Polar is never called. Every event is a signed webhook delivered to the real
 * endpoint exactly as Polar would deliver it — same signature scheme, same
 * payload schema — and every assertion reads the database or the rendered
 * billing page afterwards. That makes the whole lifecycle testable without a
 * card, including the states nobody can reproduce on demand: a redelivered
 * event, a renewal, a mid-cycle upgrade, a failed payment, a revocation.
 *
 * The suite creates its own organizations and deletes them at the end, so it
 * can run against a database that already has real data in it. Set KEEP=1 to
 * leave the fixtures behind for inspection.
 *
 * Usage: pnpm dev, then `node scripts/billing-test.mjs`
 */

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const ORIGIN = process.env.BETTER_AUTH_URL ?? BASE
const SECRET = process.env.POLAR_WEBHOOK_SECRET
const KEEP = process.env.KEEP === '1'

const sql = postgres(process.env.DATABASE_URL, { max: 8 })

/*
 * Piping the run through `head` closes stdout early, and an unhandled EPIPE
 * kills the process before the fixtures are deleted and the borrowed rows put
 * back. Swallowing the write error costs the tail of the log and keeps the
 * database clean, which is the better trade.
 */
process.stdout.on('error', () => {})

const stamp = Date.now()
let passed = 0
let failed = 0
const failures = []
const findings = []

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

/**
 * Behaviour that is not a broken assertion but is worth a human decision —
 * money moving in a way a customer would argue with, or an event the product
 * silently ignores. Recorded and printed rather than failing the run.
 */
function finding(title, detail) {
  findings.push({ title, detail })
  console.log(`  \x1b[33m▲\x1b[0m ${title} — ${detail}`)
}

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`)
}

/* -------------------------------------------------------------------------- */
/*                              HTTP + session                                */
/* -------------------------------------------------------------------------- */

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
      Origin: ORIGIN,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookies?.size ? { Cookie: cookies.header() } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  cookies?.capture(response)
  return response
}

/* -------------------------------------------------------------------------- */
/*                          Signed webhook delivery                            */
/* -------------------------------------------------------------------------- */

/**
 * Delivers one event the way Polar does.
 *
 * Polar base64-encodes the configured secret before handing it to the Standard
 * Webhooks library, which base64-decodes it again — so the signing key is the
 * raw secret bytes. Getting this wrong would make every test pass for the wrong
 * reason: an endpoint that rejects everything looks exactly like one that never
 * grants credits twice.
 */
async function deliver(type, data, options = {}) {
  const {
    secret = SECRET,
    tamper = false,
    skewSeconds = 0,
    omitSignature = false,
    id = `evt_${stamp}_${Math.random().toString(36).slice(2, 10)}`,
  } = options

  const payload = JSON.stringify({ type, timestamp: new Date().toISOString(), data })
  const timestampSeconds = Math.floor(Date.now() / 1000) + skewSeconds

  const mac = crypto.createHmac('sha256', Buffer.from(secret, 'utf-8'))
  mac.update(`${id}.${timestampSeconds}.${payload}`)

  const headers = { 'Content-Type': 'application/json' }
  if (!omitSignature) {
    headers['webhook-id'] = id
    headers['webhook-timestamp'] = String(timestampSeconds)
    headers['webhook-signature'] = `v1,${mac.digest('base64')}`
  }

  const response = await fetch(`${BASE}/api/webhooks/polar`, {
    method: 'POST',
    headers,
    // Tampering after signing is what an attacker replaying a captured
    // delivery with a different amount would actually do.
    body: tamper ? payload.replace(/"amount":\s*\d+/, '"amount":999999') : payload,
  })

  return response
}

/* -------------------------------------------------------------------------- */
/*                              Payload fixtures                               */
/* -------------------------------------------------------------------------- */

const iso = (date) => new Date(date).toISOString()

function polarCustomer(customerId) {
  return {
    id: customerId,
    created_at: iso(Date.now()),
    modified_at: iso(Date.now()),
    metadata: {},
    external_id: null,
    email: `customer-${customerId}@brandora-test.com`,
    email_verified: true,
    type: 'individual',
    name: 'Billing Test',
    billing_name: null,
    billing_address: null,
    tax_id: null,
    organization_id: 'polar_org_test',
    deleted_at: null,
    avatar_url: 'https://example.com/avatar.png',
  }
}

function polarProduct(productId, { recurring = true } = {}) {
  return {
    id: productId,
    created_at: iso(Date.now()),
    modified_at: iso(Date.now()),
    trial_interval: null,
    trial_interval_count: null,
    name: 'Test product',
    description: null,
    visibility: 'public',
    recurring_interval: recurring ? 'month' : null,
    recurring_interval_count: recurring ? 1 : null,
    meter_interval: null,
    meter_interval_count: null,
    is_recurring: recurring,
    is_archived: false,
    organization_id: 'polar_org_test',
    metadata: {},
    prices: [],
    benefits: [],
    medias: [],
    attached_custom_fields: [],
  }
}

function subscriptionData({
  id,
  productId,
  customerId,
  organizationId,
  status = 'active',
  periodStart,
  periodEnd,
  cancelAtPeriodEnd = false,
  canceledAt = null,
  interval = 'month',
  metadata,
  amount = 7900,
}) {
  return {
    created_at: iso(periodStart),
    modified_at: iso(Date.now()),
    id,
    amount,
    currency: 'usd',
    recurring_interval: interval,
    recurring_interval_count: 1,
    status,
    current_period_start: iso(periodStart),
    current_period_end: iso(periodEnd),
    current_meter_period_start: iso(periodStart),
    current_meter_period_end: iso(periodEnd),
    trial_start: null,
    trial_end: null,
    cancel_at_period_end: cancelAtPeriodEnd,
    canceled_at: canceledAt ? iso(canceledAt) : null,
    started_at: iso(periodStart),
    ends_at: null,
    ended_at: null,
    pause_at_period_end: false,
    paused_at: null,
    resumes_at: null,
    customer_id: customerId,
    product_id: productId,
    discount_id: null,
    checkout_id: null,
    customer_cancellation_reason: null,
    customer_cancellation_comment: null,
    metadata: metadata ?? (organizationId ? { organizationId } : {}),
    customer: polarCustomer(customerId),
    product: polarProduct(productId),
    discount: null,
    prices: [],
    meters: [],
    pending_update: null,
  }
}

function orderData({
  id,
  productId,
  customerId,
  organizationId,
  metadata,
  netAmount = 1900,
  totalAmount = netAmount,
  taxAmount = 0,
  subscriptionId = null,
  status = 'paid',
  refundedAmount = 0,
  currency = 'usd',
}) {
  return {
    id,
    created_at: iso(Date.now()),
    modified_at: iso(Date.now()),
    status,
    paid: status === 'paid',
    subtotal_amount: netAmount,
    discount_amount: 0,
    net_amount: netAmount,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    applied_balance_amount: 0,
    due_amount: 0,
    refunded_amount: refundedAmount,
    refunded_tax_amount: 0,
    currency,
    billing_reason: subscriptionId ? 'subscription_cycle' : 'purchase',
    billing_name: 'Billing Test',
    billing_address: null,
    invoice_number: `INV-${id}`,
    is_invoice_generated: false,
    receipt_number: null,
    customer_id: customerId,
    product_id: productId,
    discount_id: null,
    subscription_id: subscriptionId,
    checkout_id: null,
    metadata: metadata ?? (organizationId ? { organizationId } : {}),
    platform_fee_amount: 0,
    platform_fee_currency: currency,
    customer: polarCustomer(customerId),
    product: polarProduct(productId, { recurring: Boolean(subscriptionId) }),
    discount: null,
    subscription: null,
    items: [],
    description: 'Test order',
    refundable_amount: netAmount,
    refundable_tax_amount: 0,
  }
}

/* -------------------------------------------------------------------------- */
/*                              Database helpers                               */
/* -------------------------------------------------------------------------- */

const org = async (id) => (await sql`SELECT * FROM organizations WHERE id = ${id}`)[0]
const balance = async (id) => (await org(id))?.credit_balance
const subs = (orgId) =>
  sql`SELECT s.*, p.slug AS plan_slug FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
      WHERE s.organization_id = ${orgId} ORDER BY s.created_at`
const ledger = (orgId) =>
  sql`SELECT * FROM credit_transactions WHERE organization_id = ${orgId} ORDER BY created_at`
const ordersFor = (orgId) =>
  sql`SELECT * FROM orders WHERE organization_id = ${orgId} ORDER BY created_at`

/** Creates a real account through sign-up, so the org is bootstrapped normally. */
async function createAccount(label) {
  await sql`DELETE FROM rate_limits WHERE key LIKE '%/sign-up/email'`

  const email = `billing-${label}-${stamp}@brandora-test.com`
  const cookies = jar()
  const response = await request('/api/auth/sign-up/email', {
    cookies,
    method: 'POST',
    body: { name: `Billing ${label}`, email, password: 'testpassword123', locale: 'en' },
  })

  if (response.status !== 200) {
    throw new Error(`sign-up failed (${response.status}): ${(await response.text()).slice(0, 200)}`)
  }

  const [user] = await sql`SELECT id FROM users WHERE email = ${email}`
  await sql`UPDATE users SET email_verified = true WHERE id = ${user.id}`

  const [organization] = await sql`
    SELECT o.* FROM organizations o
    JOIN members m ON m.organization_id = o.id
    WHERE m.user_id = ${user.id}`

  return { email, userId: user.id, orgId: organization.id, cookies }
}

/** The plan name shown in the "Current plan" tile, as a customer would read it. */
async function currentPlanOnPage(cookies) {
  const html = await (await request('/en/dashboard/billing', { cookies })).text()
  const label = html.indexOf('Current plan')
  const match =
    label === -1 ? null : html.slice(label, label + 500).match(/<p[^>]*>\s*([^<>]{1,40}?)\s*<\/p>/)
  return { name: match?.[1]?.trim() ?? null, html }
}

const MONTH = 30 * 24 * 60 * 60 * 1000

/* -------------------------------------------------------------------------- */
/*                                   Suite                                     */
/* -------------------------------------------------------------------------- */

async function main() {
  const created = { users: [], orgs: [] }
  const restore = []

  try {
    /* ------------------------------------------------------------ preflight */
    section('Preflight')

    check('POLAR_WEBHOOK_SECRET is configured', Boolean(SECRET))
    if (!SECRET) throw new Error('cannot sign webhooks without POLAR_WEBHOOK_SECRET')

    const landing = await request('/en')
    check('application is answering', landing.status === 200, `got ${landing.status}`)

    const planRows = await sql`SELECT * FROM plans ORDER BY sort_order`
    const plan = Object.fromEntries(planRows.map((row) => [row.slug, row]))
    const packRows = await sql`SELECT * FROM credit_packs ORDER BY sort_order`
    const pack = Object.fromEntries(packRows.map((row) => [row.slug, row]))

    for (const slug of ['basic', 'pro', 'business']) {
      check(
        `${slug} plan has a monthly Polar product`,
        Boolean(plan[slug]?.polar_product_id_monthly),
        'not connected',
      )
    }

    // Billing is monthly. A priced annual period nobody can buy is the state
    // this was removed from, so it is asserted rather than left to drift back.
    const pricedAnnually = planRows.filter((row) => row.price_yearly > 0).map((row) => row.slug)
    check('no plan carries an annual price', pricedAnnually.length === 0, pricedAnnually.join(', '))

    const pricingPage = await (await request('/en/pricing')).text()
    check('the pricing page offers no billing period switch', !pricingPage.includes('/year'))

    check('at least one credit pack is connected', Boolean(pack.pack_small?.polar_product_id))

    /* --------------------------------------------------------- endpoint gate */
    section('Webhook endpoint refuses what it cannot trust')

    const guardOrg = await createAccount('guard')
    created.users.push(guardOrg.userId)
    created.orgs.push(guardOrg.orgId)

    const guardEvent = () =>
      subscriptionData({
        id: `sub_guard_${stamp}`,
        productId: plan.pro.polar_product_id_monthly,
        customerId: `cus_guard_${stamp}`,
        organizationId: guardOrg.orgId,
        periodStart: Date.now(),
        periodEnd: Date.now() + MONTH,
      })

    const unsigned = await deliver('subscription.active', guardEvent(), { omitSignature: true })
    check('unsigned delivery is refused', unsigned.status === 403, `got ${unsigned.status}`)

    const wrongSecret = await deliver('subscription.active', guardEvent(), {
      secret: 'not-the-real-secret',
    })
    check('wrong signing secret is refused', wrongSecret.status === 403, `got ${wrongSecret.status}`)

    const tampered = await deliver('subscription.active', guardEvent(), { tamper: true })
    check('body tampered after signing is refused', tampered.status === 403, `got ${tampered.status}`)

    const stale = await deliver('subscription.active', guardEvent(), { skewSeconds: -60 * 15 })
    check('stale timestamp is refused', stale.status === 403, `got ${stale.status}`)

    const future = await deliver('subscription.active', guardEvent(), { skewSeconds: 60 * 15 })
    check('future timestamp is refused', future.status === 403, `got ${future.status}`)

    const malformed = await deliver('subscription.active', { id: 'sub_broken' })
    check(
      'a payload the SDK cannot parse is acknowledged rather than retried forever',
      malformed.status === 202,
      `got ${malformed.status}`,
    )

    check(
      'no billing state survived the refused deliveries',
      (await subs(guardOrg.orgId)).length === 0 && (await balance(guardOrg.orgId)) === 10,
      `balance ${await balance(guardOrg.orgId)}`,
    )

    const unknownType = await deliver('subscription.trialing', {
      id: `sub_unknown_type_${stamp}`,
    })
    check(
      'an event type this SDK version does not know is acknowledged',
      unknownType.status >= 200 && unknownType.status < 300,
      `got ${unknownType.status}`,
    )

    const wrongMethod = await request('/api/webhooks/polar')
    check('GET on the webhook endpoint is not allowed', wrongMethod.status === 405, `got ${wrongMethod.status}`)

    /* ------------------------------------------------------ subscription arc */
    section('Subscription lifecycle')

    const a = await createAccount('lifecycle')
    created.users.push(a.userId)
    created.orgs.push(a.orgId)

    const subId = `sub_life_${stamp}`
    const customerId = `cus_life_${stamp}`
    const period1 = Date.now() - 2 * 60 * 1000
    const period1End = period1 + MONTH

    const sub = (overrides = {}) =>
      subscriptionData({
        id: subId,
        productId: plan.pro.polar_product_id_monthly,
        customerId,
        organizationId: a.orgId,
        periodStart: period1,
        periodEnd: period1End,
        ...overrides,
      })

    const createdRes = await deliver('subscription.created', sub())
    check('subscription.created accepted', createdRes.ok, `got ${createdRes.status}`)

    let rows = await subs(a.orgId)
    check('subscription row written', rows.length === 1, `${rows.length} rows`)
    check('plan resolved from the Polar product', rows[0]?.plan_slug === 'pro', rows[0]?.plan_slug)
    check('interval resolved from the product, not the click', rows[0]?.interval === 'monthly')
    check('status is active', rows[0]?.status === 'active', rows[0]?.status)
    check('period recorded', Boolean(rows[0]?.current_period_start && rows[0]?.current_period_end))
    check('Polar customer id stored on the organization', (await org(a.orgId))?.polar_customer_id === customerId)
    check(
      'creation alone grants no credits',
      (await balance(a.orgId)) === 10,
      `balance ${await balance(a.orgId)}`,
    )

    await deliver('subscription.active', sub())
    check(
      'activation grants the plan credits',
      (await balance(a.orgId)) === 10 + plan.pro.monthly_credits,
      `balance ${await balance(a.orgId)}`,
    )

    const grants = (await ledger(a.orgId)).filter((row) => row.reason === 'subscription_grant')
    check('grant recorded in the ledger', grants.length === 2, `${grants.length} grants (signup + plan)`)
    check('grant carries an idempotency key', Boolean(grants.at(-1)?.idempotency_key))

    await deliver('subscription.active', sub())
    await deliver('subscription.active', sub())
    check(
      'redelivered activation grants nothing further',
      (await balance(a.orgId)) === 10 + plan.pro.monthly_credits,
      `balance ${await balance(a.orgId)}`,
    )

    /* A renewal is a new period on the same subscription. */
    const period2 = period1 + MONTH
    await deliver('subscription.active', sub({ periodStart: period2, periodEnd: period2 + MONTH }))
    check(
      'renewal into a new period grants again',
      (await balance(a.orgId)) === 10 + 2 * plan.pro.monthly_credits,
      `balance ${await balance(a.orgId)}`,
    )

    const page1 = await currentPlanOnPage(a.cookies)
    check('billing page shows the paid plan', page1.name === 'Pro', `showed ${page1.name}`)
    /*
      * Assertions match rendered markup, never bare text: next-intl ships the
      * whole message catalogue inside the flight payload, so `includes('Cancel
      * plan')` is true on every billing page ever rendered — including the ones
      * that deliberately hide the button.
      */
    check('billing page says when it renews', /renews \d/.test(page1.html), 'no renewal date')
    check(
      'billing page offers to change plan, not to check out again',
      page1.html.includes('>Change plan</button>'),
    )

    /* ------------------------------------------------------------ plan moves */
    section('Changing plan')

    const balanceBeforeUpgrade = await balance(a.orgId)

    await deliver(
      'subscription.updated',
      sub({
        productId: plan.business.polar_product_id_monthly,
        periodStart: period2,
        periodEnd: period2 + MONTH,
        amount: 19900,
      }),
    )

    rows = await subs(a.orgId)
    check('upgrade moves the plan in place', rows.length === 1 && rows[0].plan_slug === 'business',
      `${rows.length} rows, ${rows[0]?.plan_slug}`)

    const upgradePage = await currentPlanOnPage(a.cookies)
    check('billing page shows the new plan', upgradePage.name === 'Business', `showed ${upgradePage.name}`)

    /* Polar re-sends `active` after a product switch on the same period. */
    await deliver(
      'subscription.active',
      sub({
        productId: plan.business.polar_product_id_monthly,
        periodStart: period2,
        periodEnd: period2 + MONTH,
      }),
    )

    const afterUpgrade = await balance(a.orgId)
    check(
      'a mid-cycle upgrade grants the difference straight away',
      afterUpgrade === balanceBeforeUpgrade + (plan.business.monthly_credits - plan.pro.monthly_credits),
      `balance ${afterUpgrade}, expected ${balanceBeforeUpgrade + (plan.business.monthly_credits - plan.pro.monthly_credits)}`,
    )

    /* Re-delivering the change, and hopping back and forth, must not pay out. */
    await deliver(
      'subscription.updated',
      sub({
        productId: plan.business.polar_product_id_monthly,
        periodStart: period2,
        periodEnd: period2 + MONTH,
      }),
    )
    check(
      'a redelivered upgrade grants nothing further',
      (await balance(a.orgId)) === afterUpgrade,
      `balance ${await balance(a.orgId)}`,
    )

    /* Downgrade. */
    await deliver(
      'subscription.updated',
      sub({
        productId: plan.basic.polar_product_id_monthly,
        periodStart: period2,
        periodEnd: period2 + MONTH,
        amount: 2900,
      }),
    )

    rows = await subs(a.orgId)
    check('downgrade moves the plan in place', rows[0]?.plan_slug === 'basic', rows[0]?.plan_slug)
    check(
      'a downgrade does not claw back credits already granted',
      (await balance(a.orgId)) === afterUpgrade,
      `balance ${await balance(a.orgId)}`,
    )

    /* Hopping back up to a plan already paid for this period pays out once. */
    await deliver(
      'subscription.updated',
      sub({
        productId: plan.business.polar_product_id_monthly,
        periodStart: period2,
        periodEnd: period2 + MONTH,
      }),
    )
    check(
      'cycling plans within a period cannot farm credits',
      (await balance(a.orgId)) === afterUpgrade,
      `balance ${await balance(a.orgId)}`,
    )

    await deliver(
      'subscription.updated',
      sub({
        productId: plan.basic.polar_product_id_monthly,
        periodStart: period2,
        periodEnd: period2 + MONTH,
      }),
    )

    /* Back to Pro for the rest of the suite. */
    await deliver(
      'subscription.updated',
      sub({
        productId: plan.pro.polar_product_id_monthly,
        periodStart: period2,
        periodEnd: period2 + MONTH,
      }),
    )

    /* -------------------------------------------------------- cancel / revoke */
    section('Cancelling and losing access')

    await deliver(
      'subscription.canceled',
      sub({ cancelAtPeriodEnd: true, canceledAt: Date.now(), periodStart: period2, periodEnd: period2 + MONTH }),
    )

    rows = await subs(a.orgId)
    check('cancellation is scheduled, not immediate', rows[0]?.cancel_at_period_end === true)
    check('cancellation time recorded', Boolean(rows[0]?.canceled_at))
    check('access is kept until the period ends', rows[0]?.status === 'active', rows[0]?.status)

    const canceledPage = await currentPlanOnPage(a.cookies)
    check('billing page shows the end date', /Ends \d/.test(canceledPage.html), 'no end-date badge')
    check(
      'billing page hides cancel once cancelled',
      !canceledPage.html.includes('>Cancel plan</button>'),
    )

    /* Un-cancelling in Polar's portal. */
    await deliver(
      'subscription.uncanceled',
      sub({ cancelAtPeriodEnd: false, periodStart: period2, periodEnd: period2 + MONTH }),
    )
    rows = await subs(a.orgId)
    check('un-cancelling clears the scheduled cancellation', rows[0]?.cancel_at_period_end === false)
    check('un-cancelling clears the cancellation date', rows[0]?.canceled_at === null)

    const uncanceledPage = await currentPlanOnPage(a.cookies)
    check('billing page stops saying it ends', !/Ends \d/.test(uncanceledPage.html))

    await deliver(
      'subscription.updated',
      sub({ cancelAtPeriodEnd: false, periodStart: period2, periodEnd: period2 + MONTH }),
    )
    rows = await subs(a.orgId)
    check('a later update clears the scheduled cancellation', rows[0]?.cancel_at_period_end === false)

    /* Failed payment. */
    const balanceBeforeFailure = await balance(a.orgId)
    await deliver(
      'subscription.updated',
      sub({ status: 'past_due', periodStart: period2, periodEnd: period2 + MONTH }),
    )
    rows = await subs(a.orgId)
    check('a failed payment is recorded as past_due', rows[0]?.status === 'past_due', rows[0]?.status)

    const pastDuePage = await currentPlanOnPage(a.cookies)
    check(
      'a failed payment ends the plan immediately',
      pastDuePage.name === 'Free',
      `showed ${pastDuePage.name}`,
    )
    check('the page says why the plan stopped', pastDuePage.html.includes('Payment failed'))
    check(
      'the page says how to restore it',
      pastDuePage.html.includes('Update your payment method'),
    )
    check(
      'a failing card is not sent to a checkout Polar will refuse',
      !pastDuePage.html.includes('>Upgrade</button>'),
    )
    check(
      'a failing card can still change plan',
      pastDuePage.html.includes('>Change plan</button>'),
    )
    check(
      'credits survive a failed payment',
      (await balance(a.orgId)) === balanceBeforeFailure,
      `balance ${await balance(a.orgId)}, was ${balanceBeforeFailure}`,
    )

    /* Paying again restores the plan without a new subscription. */
    await deliver(
      'subscription.updated',
      sub({ status: 'active', periodStart: period2, periodEnd: period2 + MONTH }),
    )
    const recoveredPage = await currentPlanOnPage(a.cookies)
    check('a successful payment restores the plan', recoveredPage.name === 'Pro', `showed ${recoveredPage.name}`)

    /* Access ends. */
    const balanceBeforeRevoke = await balance(a.orgId)
    await deliver(
      'subscription.revoked',
      sub({ status: 'revoked', periodStart: period2, periodEnd: period2 + MONTH }),
    )

    rows = await subs(a.orgId)
    check('revocation is recorded', rows[0]?.status === 'revoked', rows[0]?.status)

    const revokedPage = await currentPlanOnPage(a.cookies)
    check(
      'a revoked subscription no longer grants its plan',
      revokedPage.name === 'Free',
      `showed ${revokedPage.name}`,
    )
    check(
      'a revoked subscriber is offered checkout again',
      revokedPage.html.includes('>Upgrade</button>'),
    )
    check(
      'credits already paid for survive revocation',
      (await balance(a.orgId)) === balanceBeforeRevoke,
      `balance ${await balance(a.orgId)}`,
    )

    /* Re-subscribing after revocation. */
    const subId2 = `sub_life2_${stamp}`
    await deliver(
      'subscription.active',
      subscriptionData({
        id: subId2,
        productId: plan.business.polar_product_id_monthly,
        customerId,
        organizationId: a.orgId,
        periodStart: Date.now(),
        periodEnd: Date.now() + MONTH,
      }),
    )

    rows = await subs(a.orgId)
    check(
      'the old subscription is kept for history',
      rows.length === 2,
      `${rows.map((r) => `${r.plan_slug}/${r.status}`).join(', ')}`,
    )

    /* Two rows, one of them dead: the live one has to win, every time. */
    const resubscribed = await currentPlanOnPage(a.cookies)
    const again = await currentPlanOnPage(a.cookies)
    check(
      'the live subscription decides the plan, not the database',
      resubscribed.name === 'Business' && again.name === 'Business',
      `showed ${resubscribed.name} then ${again.name}`,
    )
    check('re-subscription grants the new plan credits',
      (await balance(a.orgId)) === balanceBeforeRevoke + plan.business.monthly_credits,
      `balance ${await balance(a.orgId)}`)

    /* ------------------------------------------------------ orders and packs */
    section('Orders, credit packs and refunds')

    const b = await createAccount('orders')
    created.users.push(b.userId)
    created.orgs.push(b.orgId)

    const orderId = `ord_pack_${stamp}`
    const packCustomer = `cus_pack_${stamp}`

    await deliver(
      'order.paid',
      orderData({
        id: orderId,
        productId: pack.pack_small.polar_product_id,
        customerId: packCustomer,
        organizationId: b.orgId,
        netAmount: pack.pack_small.price,
        totalAmount: pack.pack_small.price + 500,
        taxAmount: 500,
      }),
    )

    let orderRows = await ordersFor(b.orgId)
    check('order recorded', orderRows.length === 1, `${orderRows.length} rows`)
    check('order marked paid', orderRows[0]?.status === 'paid', orderRows[0]?.status)
    check('tax recorded separately', orderRows[0]?.tax_amount === 500, String(orderRows[0]?.tax_amount))
    check('currency normalised to upper case', orderRows[0]?.currency === 'USD', orderRows[0]?.currency)
    check(
      'pack credits granted',
      (await balance(b.orgId)) === 10 + pack.pack_small.credits,
      `balance ${await balance(b.orgId)}`,
    )

    check(
      'the payment history shows what was charged, tax included',
      orderRows[0]?.amount === pack.pack_small.price + 500,
      `recorded ${orderRows[0]?.amount}, charged ${pack.pack_small.price + 500}`,
    )

    await deliver(
      'order.paid',
      orderData({
        id: orderId,
        productId: pack.pack_small.polar_product_id,
        customerId: packCustomer,
        organizationId: b.orgId,
        netAmount: pack.pack_small.price,
      }),
    )
    check('redelivered order does not duplicate', (await ordersFor(b.orgId)).length === 1)
    check(
      'redelivered order does not grant twice',
      (await balance(b.orgId)) === 10 + pack.pack_small.credits,
      `balance ${await balance(b.orgId)}`,
    )

    /* A subscription invoice is an order too, and must not grant pack credits. */
    const balanceBeforeSubOrder = await balance(b.orgId)
    await deliver(
      'order.paid',
      orderData({
        id: `ord_sub_${stamp}`,
        productId: plan.pro.polar_product_id_monthly,
        customerId: packCustomer,
        organizationId: b.orgId,
        netAmount: plan.pro.price_monthly,
        subscriptionId: `sub_unrelated_${stamp}`,
      }),
    )
    check('subscription invoice is recorded', (await ordersFor(b.orgId)).length === 2)
    check(
      'subscription invoice grants no pack credits',
      (await balance(b.orgId)) === balanceBeforeSubOrder,
      `balance ${await balance(b.orgId)}`,
    )

    /* Customer-id fallback: an event with no metadata still finds the org. */
    await sql`UPDATE organizations SET polar_customer_id = ${packCustomer} WHERE id = ${b.orgId}`
    await deliver(
      'order.paid',
      orderData({
        id: `ord_nometa_${stamp}`,
        productId: pack.pack_small.polar_product_id,
        customerId: packCustomer,
        metadata: {},
        netAmount: pack.pack_small.price,
      }),
    )
    check(
      'an event with no metadata resolves through the Polar customer id',
      (await balance(b.orgId)) === balanceBeforeSubOrder + pack.pack_small.credits,
      `balance ${await balance(b.orgId)}`,
    )

    /* Refund. */
    const balanceBeforeRefund = await balance(b.orgId)
    const fullRefund = () =>
      orderData({
        id: orderId,
        productId: pack.pack_small.polar_product_id,
        customerId: packCustomer,
        organizationId: b.orgId,
        netAmount: pack.pack_small.price,
        totalAmount: pack.pack_small.price + 500,
        taxAmount: 500,
        status: 'refunded',
        refundedAmount: pack.pack_small.price + 500,
      })

    await deliver('order.refunded', fullRefund())

    orderRows = await ordersFor(b.orgId)
    const refunded = orderRows.find((row) => row.polar_order_id === orderId)
    check('refunded order is marked refunded', refunded?.status === 'refunded', refunded?.status)
    check(
      'refund reverses the granted credits',
      (await balance(b.orgId)) === balanceBeforeRefund - pack.pack_small.credits,
      `balance ${await balance(b.orgId)}`,
    )

    await deliver('order.refunded', fullRefund())
    check(
      'a redelivered refund reverses only once',
      (await balance(b.orgId)) === balanceBeforeRefund - pack.pack_small.credits,
      `balance ${await balance(b.orgId)}`,
    )

    /* Partial refund. */
    const partialId = `ord_partial_${stamp}`
    await deliver(
      'order.paid',
      orderData({
        id: partialId,
        productId: pack.pack_large.polar_product_id,
        customerId: packCustomer,
        organizationId: b.orgId,
        netAmount: pack.pack_large.price,
      }),
    )
    const beforePartial = await balance(b.orgId)
    await deliver(
      'order.refunded',
      orderData({
        id: partialId,
        productId: pack.pack_large.polar_product_id,
        customerId: packCustomer,
        organizationId: b.orgId,
        netAmount: pack.pack_large.price,
        status: 'partially_refunded',
        refundedAmount: Math.round(pack.pack_large.price / 4),
      }),
    )
    const afterPartial = await balance(b.orgId)
    check(
      'a partial refund takes back only the share refunded',
      beforePartial - afterPartial === Math.round(pack.pack_large.credits / 4),
      `took ${beforePartial - afterPartial} of ${pack.pack_large.credits}`,
    )
    const partialRow = (await ordersFor(b.orgId)).find((row) => row.polar_order_id === partialId)
    check(
      'a partially refunded order is still a payment',
      partialRow?.status === 'paid',
      partialRow?.status,
    )

    const unknownRefund = await deliver(
      'order.refunded',
      orderData({
        id: `ord_unknown_${stamp}`,
        productId: pack.pack_small.polar_product_id,
        customerId: packCustomer,
        organizationId: b.orgId,
        status: 'refunded',
      }),
    )
    check('a refund for an unknown order is a no-op', unknownRefund.ok, `got ${unknownRefund.status}`)

    /* -------------------------------------------------------- hostile input */
    section('Events that do not fit')

    const unknownProduct = await deliver(
      'subscription.active',
      subscriptionData({
        id: `sub_unknown_${stamp}`,
        productId: 'product-that-is-not-sold-here',
        customerId: `cus_unknown_${stamp}`,
        organizationId: b.orgId,
        periodStart: Date.now(),
        periodEnd: Date.now() + MONTH,
      }),
    )
    check('an unknown product is accepted and ignored', unknownProduct.ok, `got ${unknownProduct.status}`)
    check('an unknown product writes no subscription', (await subs(b.orgId)).length === 0)

    const orphan = await deliver(
      'subscription.active',
      subscriptionData({
        id: `sub_orphan_${stamp}`,
        productId: plan.pro.polar_product_id_monthly,
        customerId: `cus_orphan_${stamp}`,
        organizationId: `org-that-does-not-exist-${stamp}`,
        periodStart: Date.now(),
        periodEnd: Date.now() + MONTH,
      }),
    )
    check(
      'an event naming a deleted organization is acknowledged, not retried',
      orphan.ok,
      `got ${orphan.status}`,
    )

    const noOwner = await deliver(
      'subscription.active',
      subscriptionData({
        id: `sub_noowner_${stamp}`,
        productId: plan.pro.polar_product_id_monthly,
        customerId: `cus_noowner_${stamp}`,
        metadata: {},
        periodStart: Date.now(),
        periodEnd: Date.now() + MONTH,
      }),
    )
    check('an unattributable event is accepted and ignored', noOwner.ok, `got ${noOwner.status}`)

    /* Cross-tenant: metadata for org B arriving on org A's customer. */
    const crossBalance = await balance(b.orgId)
    await deliver(
      'order.paid',
      orderData({
        id: `ord_cross_${stamp}`,
        productId: pack.pack_small.polar_product_id,
        customerId,
        organizationId: b.orgId,
        netAmount: pack.pack_small.price,
      }),
    )
    check(
      'metadata decides attribution, not the customer id',
      (await balance(b.orgId)) === crossBalance + pack.pack_small.credits,
      `balance ${await balance(b.orgId)}`,
    )

    /* ------------------------------------------------------------ concurrency */
    section('Concurrent delivery')

    const c = await createAccount('race')
    created.users.push(c.userId)
    created.orgs.push(c.orgId)

    const raceSub = subscriptionData({
      id: `sub_race_${stamp}`,
      productId: plan.pro.polar_product_id_monthly,
      customerId: `cus_race_${stamp}`,
      organizationId: c.orgId,
      periodStart: Date.now(),
      periodEnd: Date.now() + MONTH,
    })

    const raceResults = await Promise.all(
      Array.from({ length: 8 }, () => deliver('subscription.active', raceSub)),
    )
    const raceFailures = raceResults.filter((res) => !res.ok)

    const raceGrants = (await ledger(c.orgId)).filter((row) => row.reason === 'subscription_grant')
    check(
      'eight simultaneous activations grant exactly once',
      raceGrants.length === 2,
      `${raceGrants.length} grants (signup + plan)`,
    )
    check(
      'balance after the race is correct',
      (await balance(c.orgId)) === 10 + plan.pro.monthly_credits,
      `balance ${await balance(c.orgId)}`,
    )
    check(
      'one subscription row after the race',
      (await subs(c.orgId)).length === 1,
      `${(await subs(c.orgId)).length} rows`,
    )
    check(
      'every simultaneous delivery is answered cleanly',
      raceFailures.length === 0,
      `${raceFailures.length} of 8 answered ${[...new Set(raceFailures.map((r) => r.status))].join(', ')}`,
    )

    const raceOrder = orderData({
      id: `ord_race_${stamp}`,
      productId: pack.pack_medium.polar_product_id,
      customerId: `cus_race_${stamp}`,
      organizationId: c.orgId,
      netAmount: pack.pack_medium.price,
    })
    const orderRace = await Promise.all(
      Array.from({ length: 8 }, () => deliver('order.paid', raceOrder)),
    )
    check('eight simultaneous order deliveries record one order', (await ordersFor(c.orgId)).length === 1,
      `${(await ordersFor(c.orgId)).length} rows`)
    check(
      'eight simultaneous order deliveries grant one pack',
      (await balance(c.orgId)) === 10 + plan.pro.monthly_credits + pack.pack_medium.credits,
      `balance ${await balance(c.orgId)}`,
    )
    const orderRaceFailures = orderRace.filter((res) => !res.ok)
    check(
      'every simultaneous order delivery is answered cleanly',
      orderRaceFailures.length === 0,
      `${orderRaceFailures.length} of 8 answered ${[...new Set(orderRaceFailures.map((r) => r.status))].join(', ')}`,
    )

    /* ------------------------------------------------------- who may do what */
    section('Only the owner manages the subscription')

    const ownerPage = await (await request('/en/dashboard/billing', { cookies: c.cookies })).text()
    check('an owner is offered the cancel control', ownerPage.includes('>Cancel plan</button>'))
    check('an owner is offered plan changes', ownerPage.includes('>Change plan</button>'))

    await sql`UPDATE members SET role = 'member' WHERE organization_id = ${c.orgId} AND user_id = ${c.userId}`
    restore.push(
      () => sql`UPDATE members SET role = 'owner' WHERE organization_id = ${c.orgId} AND user_id = ${c.userId}`,
    )

    const memberPage = await (await request('/en/dashboard/billing', { cookies: c.cookies })).text()
    check('a member cannot cancel the subscription', !memberPage.includes('>Cancel plan</button>'))
    check('a member cannot change plan', !memberPage.includes('>Change plan</button>'))
    check('a member cannot buy a credit pack', !memberPage.includes('>Buy</button>'))
    check('a member still sees the plan and balance', /Current plan<\/p>/.test(memberPage))

    await sql`UPDATE members SET role = 'owner' WHERE organization_id = ${c.orgId} AND user_id = ${c.userId}`

    const anonPortal = await request('/api/portal')
    check(
      'the customer portal sends an anonymous caller to sign in',
      (anonPortal.status === 307 || anonPortal.status === 302) &&
        (anonPortal.headers.get('location') ?? '').includes('/login'),
      `got ${anonPortal.status} → ${anonPortal.headers.get('location')}`,
    )

    const noCustomer = await createAccount('nocustomer')
    created.users.push(noCustomer.userId)
    created.orgs.push(noCustomer.orgId)
    const portalWithoutBilling = await request('/api/portal', { cookies: noCustomer.cookies })
    check(
      'the customer portal sends an organization with no billing account back to billing',
      (portalWithoutBilling.status === 307 || portalWithoutBilling.status === 302) &&
        (portalWithoutBilling.headers.get('location') ?? '').includes('/dashboard/billing'),
      `got ${portalWithoutBilling.status} → ${portalWithoutBilling.headers.get('location')}`,
    )

    /* --------------------------------------------------------- the ledger holds */
    section('Ledger integrity')

    for (const orgId of created.orgs) {
      const [row] = await sql`
        SELECT o.credit_balance, COALESCE(SUM(ct.amount), 0)::int AS ledger
        FROM organizations o
        LEFT JOIN credit_transactions ct ON ct.organization_id = o.id
        WHERE o.id = ${orgId}
        GROUP BY o.credit_balance`
      check(
        `cached balance matches the ledger (${orgId.slice(0, 12)}…)`,
        row?.credit_balance === row?.ledger,
        `cache ${row?.credit_balance} vs ledger ${row?.ledger}`,
      )
    }

    for (const orgId of created.orgs) {
      const entries = await ledger(orgId)
      let running = 0
      let broken = null
      for (const entry of entries) {
        running += entry.amount
        if (entry.balance_after !== running) {
          broken = `${entry.reason}: recorded ${entry.balance_after}, replayed ${running}`
          break
        }
      }
      check(`balance_after replays exactly (${orgId.slice(0, 12)}…)`, broken === null, broken ?? '')
    }

    const dupes = await sql`
      SELECT idempotency_key, COUNT(*) FROM credit_transactions
      WHERE idempotency_key IS NOT NULL
      GROUP BY idempotency_key HAVING COUNT(*) > 1`
    check('no idempotency key was used twice', dupes.length === 0, `${dupes.length} duplicated`)

    const globalDrift = await sql`
      SELECT o.id FROM organizations o
      LEFT JOIN credit_transactions ct ON ct.organization_id = o.id
      GROUP BY o.id, o.credit_balance
      HAVING o.credit_balance <> COALESCE(SUM(ct.amount), 0)::int`
    check('no organization anywhere has drifted', globalDrift.length === 0, `${globalDrift.length} drifting`)

    const orphanSubs = await sql`
      SELECT s.id FROM subscriptions s
      LEFT JOIN plans p ON p.id = s.plan_id WHERE p.id IS NULL`
    check('every subscription points at a real plan', orphanSubs.length === 0)

    const duplicateActive = await sql`
      SELECT organization_id, COUNT(*) AS n FROM subscriptions
      WHERE status IN ('active', 'trialing', 'past_due')
      GROUP BY organization_id HAVING COUNT(*) > 1`
    if (duplicateActive.length > 0) {
      finding(
        'organizations hold more than one entitling subscription row',
        `${duplicateActive.length} organization(s) have several live rows; resolution is deterministic now, but nothing in the schema forbids the state`,
      )
    }
  } finally {
    for (const undo of restore) {
      await undo().catch(() => {})
    }

    if (!KEEP && created.orgs?.length) {
      await sql`DELETE FROM organizations WHERE id = ANY(${created.orgs})`
      await sql`DELETE FROM users WHERE id = ANY(${created.users})`
    }
  }

  /* ------------------------------------------------------------------ report */
  console.log(`\n\x1b[1mResult\x1b[0m  ${passed} passed, ${failed} failed`)

  if (failures.length > 0) {
    console.log('\n\x1b[31mFailures\x1b[0m')
    for (const failure of failures) console.log(`  · ${failure}`)
  }

  if (findings.length > 0) {
    console.log('\n\x1b[33mFindings\x1b[0m  (behaviour worth a decision, not broken assertions)')
    for (const item of findings) console.log(`  · ${item.title}\n      ${item.detail}`)
  }

  await sql.end()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(async (error) => {
  console.error('\n\x1b[31mSuite aborted\x1b[0m', error)
  await sql.end().catch(() => {})
  process.exit(1)
})
