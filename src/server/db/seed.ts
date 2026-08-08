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
    maxProjects: 3,
    websiteBuilder: false,
    socialMediaKit: false,
    vectorExport: false,
    brandAssistant: false,
    customDomain: false,
    priorityQueue: false,
    sortOrder: 0,
    features: {
      en: [
        '5 name ideas, each with its reasoning',
        'Two logo concepts',
        'Colour palette and typography',
        'Brand story, voice and values',
        'Instagram bio and captions',
      ],
      ar: [
        'خمسة أسماء مقترحة مع سبب كل اسم',
        'مفهومان للشعار',
        'لوحة ألوان وخطوط',
        'قصة العلامة وصوتها وقيمها',
        'نبذة إنستغرام ونصوص المنشورات',
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
    /* 20 brands x 13 credits — see BRAND_COST in billing/credits. */
    monthlyCredits: 260,
    seats: 1,
    maxProjects: -1,
    websiteBuilder: true,
    socialMediaKit: true,
    vectorExport: true,
    brandAssistant: true,
    customDomain: false,
    priorityQueue: false,
    sortOrder: 1,
    features: {
      en: [
        'Everything in Free',
        'Website builder and publishing',
        'SVG vector logo export',
        'Social kit — eight designed posts',
        'Brand book PDF and kit ZIP',
        'Brand Assistant',
      ],
      ar: [
        'كل ما في المجاني',
        'منشئ الموقع والنشر',
        'تصدير الشعار SVG',
        'حزمة سوشيال — ثمانية تصاميم',
        'ملف الهوية PDF وحزمة ZIP',
        'مساعد العلامة',
      ],
    },
  },
  {
    slug: 'pro',
    name: 'Pro',
    priceMonthly: 4900,
    priceYearly: 0,
    priceMonthlyAed: 17900,
    priceYearlyAed: 0,
    /* 60 brands x 13 credits. */
    monthlyCredits: 780,
    seats: 5,
    maxProjects: -1,
    websiteBuilder: true,
    socialMediaKit: true,
    vectorExport: true,
    brandAssistant: true,
    customDomain: false,
    priorityQueue: false,
    sortOrder: 2,
    features: {
      en: ['Everything in Creator', 'Three times the monthly brands', '5 team seats'],
      ar: ['كل ما في Creator', 'ثلاثة أضعاف العلامات شهرياً', 'خمسة مقاعد للفريق'],
    },
  },
  {
    slug: 'agency',
    name: 'Agency',
    priceMonthly: 9900,
    priceYearly: 0,
    priceMonthlyAed: 36400,
    priceYearlyAed: 0,
    /* 150 brands x 13 credits. */
    monthlyCredits: 1950,
    seats: -1,
    maxProjects: -1,
    websiteBuilder: true,
    socialMediaKit: true,
    vectorExport: true,
    brandAssistant: true,
    customDomain: true,
    priorityQueue: false,
    sortOrder: 3,
    features: {
      en: [
        'Everything in Pro',
        'Unlimited seats',
        'Custom domains on client sites',
        'Up to 5 client workspaces',
      ],
      ar: [
        'كل ما في Pro',
        'مقاعد بلا حدود',
        'نطاقات مخصّصة لمواقع العملاء',
        'حتى خمس مساحات عمل للعملاء',
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
