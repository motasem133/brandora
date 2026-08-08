import 'dotenv/config'

import { eq, notInArray } from 'drizzle-orm'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

import * as schema from './schema'
import { creditPacks, plans, users } from './schema'

/**
 * Seeds plans, credit packs, and (optionally) an admin user.
 *
 * Idempotent — safe to re-run. Plans and packs are matched on `slug`.
 * Run with: pnpm db:seed
 */

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed.')
}

const client = postgres(connectionString, { max: 1 })
const db = drizzle(client, { schema })

/**
 * Credit costs are documented in §7. 1 credit ≈ $0.05 of upstream AI cost.
 *
 * Yearly prices are zero because billing is monthly. The columns stay for the
 * rows already written against them; nothing is sold on an annual period, so
 * seeding a figure would put a price on the product that cannot be paid.
 */
const PLANS = [
  {
    slug: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    priceMonthlyAed: 0,
    priceYearlyAed: 0,
    /*
     * One brand, in credits.
     *
     * A free brand is branding (1) + logos (6) + the written social copy (1),
     * because the website and the designed kit are both paid. Ten leaves a
     * little slack rather than stranding someone one credit short of the thing
     * they came for.
     */
    monthlyCredits: 10, // one-time grant, not renewed — enforced in billing logic
    seats: 1,
    /* One brand, because ten credits buy exactly one and a second would be a
       workspace the customer cannot fill. */
    maxProjects: 1,
    websiteBuilder: false,
    socialMediaKit: false,
    vectorExport: false,
    brandAssistant: false,
    customDomain: false,
    maxCustomDomains: 0,
    priorityQueue: false,
    sortOrder: 0,
    features: {
      en: [
        '10 AI credits — one complete brand',
        'Names, tagline, story, values and voice',
        'Two logo concepts',
        'Colour palette and typography',
        'Instagram bio and captions',
        'Content Studio, while your credits last',
        '1 seat',
      ],
      ar: [
        '10 أرصدة ذكاء اصطناعي — علامة كاملة واحدة',
        'أسماء وشعار نصي وقصة وقيم ونبرة',
        'مفهومان للشعار',
        'لوحة ألوان وخطوط',
        'نبذة إنستغرام ونصوص المنشورات',
        'استوديو المحتوى، ما دام رصيدك متاحاً',
        'مقعد واحد',
      ],
    },
  },
  {
    slug: 'creator',
    name: 'Creator',
    priceMonthly: 1900,
    priceYearly: 0,
    priceMonthlyAed: 6900,
    priceYearlyAed: 0,
    /*
     * Credits are the unit sold, so this is the input rather than a brand count
     * derived from it. 200 a month is enough to build a brand and keep posting
     * for it — which is the behaviour the plan exists to fund. What that comes
     * to in brands or in posts is arithmetic on BRAND_COST and
     * CONTENT_CREDIT_COSTS, done at the surface that shows it.
     */
    monthlyCredits: 200,
    seats: 3,
    maxProjects: -1,
    websiteBuilder: true,
    socialMediaKit: true,
    vectorExport: true,
    brandAssistant: true,
    customDomain: true,
    maxCustomDomains: 1,
    priorityQueue: false,
    sortOrder: 1,
    features: {
      /* Six bullets, not nine. The comparison table below the cards carries the
         detail; a card that lists everything stops being a decision. */
      en: [
        '200 AI credits every month',
        'Everything in Free',
        'Unlimited brand workspaces',
        'Content Studio, website builder and Brand Assistant',
        'Brand book PDF, SVG export and kit ZIP',
        '1 custom domain · 3 seats',
      ],
      ar: [
        '200 رصيد ذكاء اصطناعي كل شهر',
        'كل ما في المجاني',
        'مساحات علامات بلا حدود',
        'استوديو المحتوى ومنشئ الموقع ومساعد العلامة',
        'ملف الهوية PDF وتصدير SVG وحزمة ZIP',
        'نطاق مخصّص واحد · ثلاثة مقاعد',
      ],
    },
  },
  {
    /*
     * Studio is the row Pro used to be, renamed in `drizzle/0011_studio_rename.sql`
     * rather than replaced. The price is unchanged, so it is the same Polar
     * product — and a fresh row would arrive with a null product id and refuse
     * to sell until someone pasted one in. It also keeps `plans.id`, which
     * `subscriptions.plan_id` points at.
     *
     * The Polar product itself must be renamed by hand. Its name is what the
     * hosted checkout and the receipt say.
     */
    slug: 'studio',
    name: 'Studio',
    priceMonthly: 4900,
    priceYearly: 0,
    priceMonthlyAed: 17900,
    priceYearlyAed: 0,
    /* Credits and people are the difference. Studio carries the same
       capabilities as Creator, three and a half times the monthly output, and
       the seats to share them. */
    monthlyCredits: 700,
    seats: 10,
    maxProjects: -1,
    websiteBuilder: true,
    socialMediaKit: true,
    vectorExport: true,
    brandAssistant: true,
    customDomain: true,
    maxCustomDomains: -1,
    priorityQueue: false,
    sortOrder: 2,
    features: {
      /*
       * Absent on purpose: client workspaces, white-label, an API, an agency
       * dashboard, analytics, priority generation and priority support. None of
       * them exist in the product. A pricing page is the worst place to
       * describe something that has not been built.
       *
       * Seats *are* listed, which they were not before — the invite flow makes
       * them real.
       */
      en: [
        '700 AI credits every month',
        'Everything in Creator',
        'Unlimited custom domains',
        '10 seats',
      ],
      ar: [
        '700 رصيد ذكاء اصطناعي كل شهر',
        'كل ما في Creator',
        'نطاقات مخصّصة بلا حدود',
        'عشرة مقاعد',
      ],
    },
  },
] satisfies (typeof plans.$inferInsert)[]

const CREDIT_PACKS = [
  { priceAed: 5499, slug: 'pack_small', name: 'Small', price: 1500, credits: 100, sortOrder: 0 },
  { priceAed: 14499, slug: 'pack_medium', name: 'Medium', price: 3900, credits: 300, sortOrder: 1 },
  { priceAed: 40999, slug: 'pack_large', name: 'Large', price: 11000, credits: 1000, sortOrder: 2 },
] satisfies (typeof creditPacks.$inferInsert)[]

async function seedPlans() {
  for (const plan of PLANS) {
    const existing = await db.select().from(plans).where(eq(plans.slug, plan.slug)).limit(1)
    if (existing.length > 0) {
      await db.update(plans).set({ ...plan, updatedAt: new Date() }).where(eq(plans.slug, plan.slug))
      console.info(`  ↻ updated plan: ${plan.slug}`)
    } else {
      await db.insert(plans).values(plan)
      console.info(`  + created plan: ${plan.slug}`)
    }
  }

  /*
   * Anything not in the list above is retired rather than left standing.
   *
   * The ladder was renamed once — basic became Creator, business became
   * Agency — and a seed that only upserts left the old rows active, so the
   * pricing page rendered six plans and two prices for the same thing.
   * Deactivated rather than deleted, because a subscription may still point
   * at one.
   */
  const retired = await db
    .update(plans)
    .set({ isActive: false })
    .where(notInArray(plans.slug, PLANS.map((plan) => plan.slug)))
    .returning({ slug: plans.slug })

  for (const plan of retired) console.log(`  · retired plan: ${plan.slug}`)
}

async function seedCreditPacks() {
  for (const pack of CREDIT_PACKS) {
    const existing = await db.select().from(creditPacks).where(eq(creditPacks.slug, pack.slug)).limit(1)
    if (existing.length > 0) {
      await db.update(creditPacks).set(pack).where(eq(creditPacks.slug, pack.slug))
      console.info(`  ↻ updated pack: ${pack.slug}`)
    } else {
      await db.insert(creditPacks).values(pack)
      console.info(`  + created pack: ${pack.slug}`)
    }
  }
}

/**
 * Promotes an existing user to admin. The account itself must be created through
 * the normal sign-up flow so Better Auth owns the password hashing — we never
 * write a credential directly, and there is no default password in this repo.
 */
async function promoteAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL
  if (!email) {
    console.info('  · SEED_ADMIN_EMAIL not set — skipping admin promotion')
    return
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user) {
    console.info(`  ! no user found for ${email} — sign up first, then re-run pnpm db:seed`)
    return
  }

  await db.update(users).set({ role: 'admin', emailVerified: true }).where(eq(users.id, user.id))
  console.info(`  ✓ promoted ${email} to admin`)
}

async function main() {
  console.info('Seeding Brandora…')
  await seedPlans()
  await seedCreditPacks()
  await promoteAdmin()
  console.info('Done.')
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await client.end()
  })
