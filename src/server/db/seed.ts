import 'dotenv/config'

import { eq } from 'drizzle-orm'
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

/** Credit costs are documented in §7. 1 credit ≈ $0.05 of upstream AI cost. */
const PLANS = [
  {
    slug: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    priceMonthlyAed: 0,
    priceYearlyAed: 0,
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
      en: ['1 full brand generation', '4 logo concepts', 'Colour palette & fonts', 'Brand story'],
      ar: ['توليد هوية كاملة مرة واحدة', '٤ مفاهيم شعار', 'لوحة ألوان وخطوط', 'قصة العلامة'],
    },
  },
  {
    slug: 'basic',
    name: 'Basic',
    priceMonthly: 2900,
    priceYearly: 29000,
    priceMonthlyAed: 11000,
    priceYearlyAed: 110000,
    monthlyCredits: 120,
    seats: 2,
    maxProjects: -1,
    websiteBuilder: true,
    socialMediaKit: false,
    vectorExport: true,
    brandAssistant: false,
    customDomain: false,
    priorityQueue: false,
    sortOrder: 1,
    features: {
      en: ['~15 generations / month', 'Website builder', 'SVG vector export', 'Brand kit ZIP', '2 seats'],
      ar: ['١٥ توليد شهرياً تقريباً', 'منشئ المواقع', 'تصدير SVG', 'حزمة الهوية', 'مستخدمان'],
    },
  },
  {
    slug: 'pro',
    name: 'Pro',
    priceMonthly: 7900,
    priceYearly: 79000,
    priceMonthlyAed: 28900,
    priceYearlyAed: 289000,
    monthlyCredits: 400,
    seats: 5,
    maxProjects: -1,
    websiteBuilder: true,
    socialMediaKit: true,
    vectorExport: true,
    brandAssistant: true,
    customDomain: false,
    priorityQueue: true,
    sortOrder: 2,
    features: {
      en: ['~50 generations / month', 'Social media kit', 'Brand Assistant AI chat', 'Priority queue', '5 seats'],
      ar: ['٥٠ توليد شهرياً تقريباً', 'حزمة السوشيال ميديا', 'مساعد العلامة الذكي', 'أولوية في المعالجة', '٥ مستخدمين'],
    },
  },
  {
    slug: 'business',
    name: 'Business',
    priceMonthly: 19900,
    priceYearly: 199000,
    priceMonthlyAed: 72900,
    priceYearlyAed: 729000,
    monthlyCredits: 1200,
    seats: -1,
    maxProjects: -1,
    websiteBuilder: true,
    socialMediaKit: true,
    vectorExport: true,
    brandAssistant: true,
    customDomain: true,
    priorityQueue: true,
    sortOrder: 3,
    features: {
      en: ['~150 generations / month', 'Custom domains', 'Unlimited seats', 'API access', 'Dedicated support'],
      ar: ['١٥٠ توليد شهرياً تقريباً', 'نطاقات مخصصة', 'مستخدمون بلا حد', 'وصول API', 'دعم مخصص'],
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
