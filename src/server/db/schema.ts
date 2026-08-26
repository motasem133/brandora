import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import type { ContentBody } from '@/lib/content'

/* -------------------------------------------------------------------------- */
/*                                   Enums                                     */
/* -------------------------------------------------------------------------- */

export const localeEnum = pgEnum('locale', ['en', 'ar'])
export const userRoleEnum = pgEnum('user_role', ['user', 'admin'])
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended'])

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'revoked',
])

/** Which period a subscription is billed on — see plans.polar_product_id_*. */
export const billingIntervalEnum = pgEnum('billing_interval', ['monthly', 'yearly'])

export const creditReasonEnum = pgEnum('credit_reason', [
  'subscription_grant',
  'purchase',
  'generation',
  'logo_render',
  'assistant_message',
  'refund',
  'admin_adjustment',
])

export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'refunded'])

export const brandStyleEnum = pgEnum('brand_style', [
  'luxury',
  'modern',
  'playful',
  'minimal',
  'arabic',
  'corporate',
])

export const projectStatusEnum = pgEnum('project_status', [
  'draft',
  'queued',
  'generating',
  'completed',
  'failed',
  'partial',
])


export const fileKindEnum = pgEnum('file_kind', [
  'logo_raster',
  'logo_svg',
  'favicon',
  'social_avatar',
  'letterhead',
  'brand_kit_zip',
  'upload',
  /** A finished, ready-to-post image. `metadata.layout` says which one. */
  'social_post',
  /** Generated photography a post is built on. `metadata.scene` says which. */
  'social_scene',
  /** The whole identity as one document. */
  'brand_kit_pdf',
])

export const jobTriggerEnum = pgEnum('job_trigger', ['initial', 'retry_section', 'regenerate'])
export const jobStatusEnum = pgEnum('job_status', ['queued', 'running', 'completed', 'failed', 'partial'])

export const aiFeatureEnum = pgEnum('ai_feature', [
  'branding',
  'website',
  /** Written social copy only. The kit's photography is `kit` — see below. */
  'social',
  /**
   * The social kit's photography.
   *
   * Split out of `social` on 11 August. One credit of written captions and
   * three generated photographs at ~$0.0675 each were the same row, so the kit
   * — the most expensive thing a run produces after the logos — was reported
   * as the cheapest, and `social` looked like a feature that cost twenty times
   * what it does. Every margin figure the admin screens draw is per feature,
   * so all of them were wrong in the same direction.
   */
  'kit',
  'logo',
  'assistant',
  'vectorize',
  /** Content Studio. Must stay in step with `UsageContext` in server/ai/run.ts:
      `recordUsage` swallows its own insert errors, so a value missing here
      loses every content row silently rather than failing anything. */
  'content',
])

/* Content Studio. Every value is declared now, including the types that are not
   built yet — adding one later means an ALTER TYPE in its own migration, and
   there is nothing to gain from spreading that out. */
export const contentTypeEnum = pgEnum('content_type', [
  'social_post',
  'carousel',
  'story',
  'platform_post',
  'ad',
  'campaign',
  'blog',
])

export const contentStatusEnum = pgEnum('content_status', ['generating', 'ready', 'failed'])

export const contentPlatformEnum = pgEnum('content_platform', [
  'instagram',
  'linkedin',
  'x',
  'facebook',
  'tiktok',
  'threads',
  'youtube',
])
export const aiProviderEnum = pgEnum('ai_provider', ['openrouter', 'byteplus', 'fal'])
export const aiStatusEnum = pgEnum('ai_status', ['success', 'error', 'timeout'])

export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'tool'])

/* -------------------------------------------------------------------------- */
/*                        Auth tables (owned by Better Auth)                   */
/* -------------------------------------------------------------------------- */
/*
 * Shapes here must match what Better Auth expects. Property names are camelCase
 * (that is what the adapter looks up); database columns stay snake_case.
 * Regenerate with `pnpm auth:generate` after changing auth plugins.
 */

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),

  // additionalFields — `role` and `status` are input:false in auth config,
  // so they can never be set by a client-supplied sign-up payload.
  locale: localeEnum('locale').notNull().default('en'),
  role: userRoleEnum('role').notNull().default('user'),
  status: userStatusEnum('status').notNull().default('active'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),

    // organization plugin
    activeOrganizationId: text('active_organization_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)],
)

export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    /** Argon2id hash for email+password accounts. Null for OAuth accounts. */
    password: text('password'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('accounts_user_id_idx').on(t.userId)],
)

export const verifications = pgTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('verifications_identifier_idx').on(t.identifier)],
)

/** Backing store for Better Auth's rate limiter (storage: 'database'). */
export const rateLimits = pgTable('rate_limits', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  count: integer('count').notNull().default(0),
  /**
   * Millisecond epoch, which overflows int4 — must be bigint.
   */
  lastRequest: bigint('last_request', { mode: 'number' }).notNull().default(0),
})

/* ------------------------------ organizations ----------------------------- */

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  metadata: text('metadata'),

  // Brandora additions
  locale: localeEnum('locale').notNull().default('en'),
  polarCustomerId: text('polar_customer_id'),
  /**
   * Cached balance = SUM(credit_transactions.amount).
   * The ledger stays the source of truth; this exists so reads stay cheap.
   */
  creditBalance: integer('credit_balance').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const members = pgTable(
  'members',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 'owner' | 'admin' | 'member' — see the capability matrix in §6. */
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('members_user_org_idx').on(t.userId, t.organizationId),
    uniqueIndex('members_unique_membership').on(t.organizationId, t.userId),
  ],
)

export const invitations = pgTable(
  'invitations',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').notNull().default('member'),
    status: text('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /*
     * Better Auth declares this required on its invitation model, and its
     * Drizzle adapter throws on insert when the column is absent. It was
     * missing, so creating an invitation failed before an email could be sent —
     * which is why the flow had never worked rather than merely being unbuilt.
     */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('invitations_org_idx').on(t.organizationId)],
)

/* -------------------------------------------------------------------------- */
/*                             Billing & entitlements                          */
/* -------------------------------------------------------------------------- */

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),

  /**
   * Money is always integer minor units. Never float.
   *
   * Both currencies are stored rather than converted: AED is pegged to USD at
   * 3.6725, but the prices actually configured in Polar are rounded to
   * marketable numbers, so a computed figure would not match what the customer
   * is charged.
   */
  priceMonthly: integer('price_monthly').notNull().default(0),
  priceYearly: integer('price_yearly').notNull().default(0),
  priceMonthlyAed: integer('price_monthly_aed').notNull().default(0),
  priceYearlyAed: integer('price_yearly_aed').notNull().default(0),

  polarProductIdMonthly: text('polar_product_id_monthly'),
  polarProductIdYearly: text('polar_product_id_yearly'),

  monthlyCredits: integer('monthly_credits').notNull().default(0),
  /** -1 = unlimited */
  seats: integer('seats').notNull().default(1),
  maxProjects: integer('max_projects').notNull().default(-1),
  /**
   * How many published sites may carry a custom domain, across the whole
   * organization. -1 = unlimited, matching `maxProjects`.
   *
   * A count rather than a second boolean because the plans differ by number:
   * one domain on Creator, as many as you like on Studio. `customDomain` stays
   * as the coarse on/off that the builder already reads.
   */
  maxCustomDomains: integer('max_custom_domains').notNull().default(0),

  websiteBuilder: boolean('website_builder').notNull().default(false),
  socialMediaKit: boolean('social_media_kit').notNull().default(false),
  vectorExport: boolean('vector_export').notNull().default(false),
  brandAssistant: boolean('brand_assistant').notNull().default(false),
  customDomain: boolean('custom_domain').notNull().default(false),
  priorityQueue: boolean('priority_queue').notNull().default(false),

  /** Display-only bullet strings, keyed by locale: { en: string[], ar: string[] } */
  features: jsonb('features').$type<Record<string, string[]>>().notNull().default({}),

  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const creditPacks = pgTable('credit_packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  /** Integer minor units, in each supported currency. */
  price: integer('price').notNull(),
  priceAed: integer('price_aed').notNull().default(0),
  credits: integer('credits').notNull(),
  polarProductId: text('polar_product_id'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id),

    polarSubscriptionId: text('polar_subscription_id').unique(),
    status: subscriptionStatusEnum('status').notNull().default('active'),
    /*
     * Which period the customer actually bought, resolved from the Polar
     * product the webhook carries rather than from what they clicked — the
     * period can change in Polar's portal without the app ever seeing it.
     */
    interval: billingIntervalEnum('interval').notNull().default('monthly'),

    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('subscriptions_org_idx').on(t.organizationId)],
)

/**
 * Append-only credit ledger. Rows are never updated or deleted — a correction
 * is a new compensating row. Balance = SUM(amount) per organization.
 */
export const creditTransactions = pgTable(
  'credit_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    /** Signed: positive = grant, negative = spend. */
    amount: integer('amount').notNull(),
    /** Running balance snapshot, for audit without replaying the whole ledger. */
    balanceAfter: integer('balance_after').notNull(),

    reason: creditReasonEnum('reason').notNull(),
    projectId: uuid('project_id'),
    generationJobId: uuid('generation_job_id'),
    polarOrderId: text('polar_order_id'),

    /**
     * Set from the upstream event ID (Polar event, Inngest job) so a redelivered
     * webhook or a retried job can never double-charge or double-grant.
     */
    idempotencyKey: text('idempotency_key'),

    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('credit_tx_org_created_idx').on(t.organizationId, t.createdAt),
    uniqueIndex('credit_tx_idempotency_idx').on(t.idempotencyKey),
  ],
)

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    polarOrderId: text('polar_order_id').notNull().unique(),
    /** Integer cents. */
    amount: integer('amount').notNull(),
    /** Collected and remitted by Polar as Merchant of Record. */
    taxAmount: integer('tax_amount').notNull().default(0),
    currency: text('currency').notNull().default('USD'),
    status: orderStatusEnum('status').notNull().default('pending'),
    invoiceUrl: text('invoice_url'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('orders_org_idx').on(t.organizationId)],
)

/* -------------------------------------------------------------------------- */
/*                                  Projects                                   */
/* -------------------------------------------------------------------------- */

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Tenant owner. Authorization is always org membership, never created_by. */
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Attribution only. */
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),

    title: text('title').notNull(),
    businessName: text('business_name'),
    industry: text('industry').notNull(),
    country: text('country').notNull(),
    /*
     * What the customer told us about their business, in their own words.
     *
     * Asked as "who are you selling to?" once, which is why the column was
     * called `target_audience`. It now asks for the whole brand — what the
     * business does, who it is for, what makes it different — because a model
     * given only an audience writes copy about the audience and draws marks
     * about nobody. Both this and the column now say what they hold.
     */
    brandBrief: text('brand_brief').notNull(),
    brandStyle: brandStyleEnum('brand_style').notNull(),
    /** Array of hex strings, max 3. */
    preferredColors: jsonb('preferred_colors').$type<string[]>().notNull().default([]),

    /**
     * Free-text direction for the logo, written by the customer.
     *
     * Appended to the generated prompt, so someone who knows what they want —
     * "a crescent moon mark", "no icon, wordmark only" — can say so rather than
     * regenerating until chance produces it.
     */
    logoBrief: text('logo_brief'),

    needsWebsite: boolean('needs_website').notNull().default(false),
    needsSocialMedia: boolean('needs_social_media').notNull().default(false),

    /** Drives the language the AI generates in — not merely a UI setting. */
    language: localeEnum('language').notNull().default('en'),
    status: projectStatusEnum('status').notNull().default('draft'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('projects_org_created_idx').on(t.organizationId, t.createdAt)],
)

export const brandingAssets = pgTable('branding_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: 'cascade' }),

  businessNameIdeas: jsonb('business_name_ideas')
    .$type<{ name: string; rationale: string }[]>()
    .notNull()
    .default([]),
  slogan: text('slogan'),
  brandStory: text('brand_story'),
  colorPalette: jsonb('color_palette').$type<{
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  } | null>(),
  fontRecommendations: jsonb('font_recommendations').$type<{
    heading: string
    body: string
    accent?: string
  } | null>(),
  brandValues: jsonb('brand_values').$type<string[]>().notNull().default([]),
  brandVoice: text('brand_voice'),
  logoConcepts: jsonb('logo_concepts')
    .$type<{ fileId: string; prompt: string; style: string }[]>()
    .notNull()
    .default([]),
  /**
   * The concept the customer chose as their logo.
   *
   * Null means undecided, in which case the first concept is shown. The OG card
   * and the monochrome mark are built from whichever concept this points at.
   */
  primaryLogoFileId: uuid('primary_logo_file_id'),

  /**
   * An optional second choice: the concept to use where there is no room for
   * text — favicons and social avatars.
   *
   * A wordmark shrunk to 32px is an unreadable smudge, which is why this
   * exists separately rather than being cropped out of the logo. Null means
   * those variants are derived from the logo itself.
   */
  markLogoFileId: uuid('mark_logo_file_id'),

  /** Provenance — which model and prompt version produced this. */
  modelUsed: text('model_used'),
  promptVersion: text('prompt_version'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const websiteAssets = pgTable(
  'website_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .unique()
      .references(() => projects.id, { onDelete: 'cascade' }),

    /**
     * The working copy — Record<pageKey, Block[]>, see the Block union in §5.
     *
     * What the builder loads and autosaves into. Deliberately not what a
     * visitor sees; that is `publishedPages` below.
     */
    pages: jsonb('pages').$type<Record<string, unknown[]>>().notNull().default({}),
    customStyles: jsonb('custom_styles').$type<Record<string, string>>().notNull().default({}),

    /**
     * What the public actually gets, copied from the working copy on publish.
     *
     * There was no such thing until now. The builder autosaved into `pages` and
     * purged the live cache, so on a published site every keystroke reached
     * visitors within a second and a half, half-typed — and nothing in the
     * product said so. A customer could not try anything.
     *
     * Null means never published, which is why these are nullable rather than
     * defaulted: "is there anything waiting to go online" is then a question
     * about a null, not a comparison of two blobs.
     */
    publishedPages: jsonb('published_pages').$type<Record<string, unknown[]>>(),
    publishedStyles: jsonb('published_styles').$type<Record<string, string>>(),

    /**
     * What each page is called in the site's own menu.
     *
     * The label only — the address never changes. A café's page of food was
     * called "Services" because the vocabulary is fixed and shared with the
     * URL; renaming the slug instead would break every link already shared and
     * every entry already indexed, to fix a word nobody types.
     */
    pageTitles: jsonb('page_titles').$type<Record<string, string>>().notNull().default({}),

    isPublished: boolean('is_published').notNull().default(false),
    subdomain: text('subdomain').unique(),
    customDomain: text('custom_domain').unique(),
    publishedAt: timestamp('published_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('website_assets_subdomain_idx').on(t.subdomain)],
)

/**
 * Messages sent from a published customer site's contact form.
 *
 * Kept as well as emailed, because email is the delivery and this is the
 * record. A message that bounces, lands in spam, or arrives while the owner is
 * changing address is gone otherwise — and "did anybody contact me?" is a
 * question a small business asks about the week it stopped hearing anything.
 *
 * Written by an unauthenticated visitor, which nothing else in this schema is.
 * So it carries no foreign key to a user, holds only what the form asked for,
 * and the columns are sized to what a form can send rather than to what a
 * database can store.
 */
export const siteMessages = pgTable(
  'site_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    /* Denormalised from the project so the workspace's messages can be read
       without a join, and so a deleted project's rows are still attributable
       while the cascade runs. */
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    email: text('email').notNull(),
    message: text('message').notNull(),

    /** Whether the copy actually reached the owner's inbox. */
    emailed: boolean('emailed').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('site_messages_project_created_idx').on(t.projectId, t.createdAt)],
)

export const socialMediaAssets = pgTable('social_media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: 'cascade' }),

  instagramBio: text('instagram_bio'),
  instagramPosts: jsonb('instagram_posts')
    .$type<{ type: string; caption: string; hashtags: string[] }[]>()
    .notNull()
    .default([]),
  storyTemplates: jsonb('story_templates').$type<unknown[]>().notNull().default([]),
  adCopy: jsonb('ad_copy').$type<Record<string, string> | null>(),
  hashtags: jsonb('hashtags').$type<string[]>().notNull().default([]),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const generatedFiles = pgTable(
  'generated_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    kind: fileKindEnum('kind').notNull(),
    /** Object key in the R2 bucket. Bytes live in R2; metadata lives here. */
    r2Key: text('r2_key').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull().default(0),
    width: integer('width'),
    height: integer('height'),

    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('generated_files_project_idx').on(t.projectId)],
)

/* -------------------------------------------------------------------------- */
/*                          Generation jobs & AI usage                         */
/* -------------------------------------------------------------------------- */

export const generationJobs = pgTable(
  'generation_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    inngestRunId: text('inngest_run_id'),
    trigger: jobTriggerEnum('trigger').notNull().default('initial'),

    /** Requested steps, e.g. ['branding','logos','website','social'] */
    sections: jsonb('sections').$type<string[]>().notNull().default([]),
    /** Per-step state — this is what the SSE stream tails. */
    progress: jsonb('progress')
      .$type<Record<string, { status: string; startedAt?: string; finishedAt?: string; error?: string }>>()
      .notNull()
      .default({}),

    status: jobStatusEnum('status').notNull().default('queued'),

    /** Held at enqueue; settled on completion with the remainder refunded. */
    creditsReserved: integer('credits_reserved').notNull().default(0),
    creditsCharged: integer('credits_charged').notNull().default(0),

    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('generation_jobs_project_created_idx').on(t.projectId, t.createdAt)],
)

/**
 * Which one-off emails a project has already caused.
 *
 * The enum has one member today. It is an enum rather than a boolean column on
 * `projects` because the next lifecycle email would need a second column, and a
 * third a third — and because the row carries when it was sent, which a boolean
 * cannot.
 *
 * The unique index below is the whole duplicate guard. Checking "have we sent
 * this?" and then sending is a race: the sweep is scheduled, and a retry or an
 * overlapping run would read the same empty result twice and send twice. The
 * row is written *before* the send instead, and the constraint is what refuses
 * the second attempt — so the question is answered by the database rather than
 * by the order two callers happen to run in.
 */
export const projectEmailKindEnum = pgEnum('project_email_kind', ['brand_nudge'])

export const projectEmails = pgTable(
  'project_emails',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    kind: projectEmailKindEnum('kind').notNull(),

    /** Claimed at, not delivered at — see the note on the guard above. */
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    /** False when Resend refused it, so a failure is visible rather than silent. */
    delivered: boolean('delivered').notNull().default(false),
  },
  (t) => [uniqueIndex('project_emails_project_kind_key').on(t.projectId, t.kind)],
)

/**
 * Lifecycle mail that belongs to a person rather than to a brand.
 *
 * `project_emails` records what has been said about a project; this records
 * what has been said to an account. The two are separate because the reminder
 * below is owed to someone who may have no project at all — and because the
 * uniqueness that makes "at most once, ever" true has to be keyed on whatever
 * the message is about.
 */
export const userEmailKindEnum = pgEnum('user_email_kind', [
  'verify_reminder',
  'feedback_request',
])

export const userEmails = pgTable(
  'user_emails',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: userEmailKindEnum('kind').notNull(),

    /** Claimed at, not delivered at — the claim is what stops a second send. */
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    /** False when Resend refused it, so a failure is visible rather than silent. */
    delivered: boolean('delivered').notNull().default(false),
  },
  (t) => [uniqueIndex('user_emails_user_kind_key').on(t.userId, t.kind)],
)

/** One row per model call. This is how per-customer margin becomes knowable. */
export const aiUsage = pgTable(
  'ai_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    generationJobId: uuid('generation_job_id').references(() => generationJobs.id, {
      onDelete: 'set null',
    }),

    feature: aiFeatureEnum('feature').notNull(),
    provider: aiProviderEnum('provider').notNull(),
    /** Exact slug, e.g. 'deepseek/deepseek-v4-pro' or 'seedream-5-0-pro'. */
    model: text('model').notNull(),

    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    /** Prompt-cache hits, billed far lower than cache misses. */
    cachedTokens: integer('cached_tokens').notNull().default(0),
    imagesGenerated: integer('images_generated').notNull().default(0),

    /** Actual upstream cost, taken from the provider response where available. */
    costUsd: numeric('cost_usd', { precision: 12, scale: 6 }).notNull().default('0'),
    latencyMs: integer('latency_ms').notNull().default(0),
    status: aiStatusEnum('status').notNull().default('success'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('ai_usage_org_created_idx').on(t.organizationId, t.createdAt),
    index('ai_usage_model_created_idx').on(t.model, t.createdAt),
  ],
)

/* -------------------------------------------------------------------------- */
/*                               Brand Assistant                               */
/* -------------------------------------------------------------------------- */

export const assistantThreads = pgTable(
  'assistant_threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title'),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('assistant_threads_project_idx').on(t.projectId)],
)

export const assistantMessages = pgTable(
  'assistant_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => assistantThreads.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),
    content: text('content').notNull(),
    /** Validated asset mutations the assistant applied, e.g. update_palette. */
    toolCalls: jsonb('tool_calls').$type<unknown[] | null>(),
    model: text('model'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('assistant_messages_thread_idx').on(t.threadId, t.createdAt)],
)

/* -------------------------------------------------------------------------- */
/*                              Content Studio                                 */
/* -------------------------------------------------------------------------- */

/**
 * A piece of generated content, and the charge that produced it.
 *
 * Organization-scoped as well as project-scoped: the library lists an account's
 * content without joining projects, and every read is tenant-filtered on the
 * column rather than trusting the id in the URL.
 *
 * Deliberately not a `generation_jobs` row. That table is per-project and
 * singular — `getLatestJobForProject` is what the project page and the SSE
 * stream read as "this brand's run", and the pipeline writes `projects.status`
 * alongside it. Content written there would put a brand generation on screen
 * with steps nothing can name.
 */
export const contentItems = pgTable(
  'content_items',
  {
    /*
     * Supplied by the client, not generated here. It is the idempotency key for
     * both the row and its ledger entries, so a double-submitted form is one
     * piece of content and one charge.
     */
    id: uuid('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),

    type: contentTypeEnum('type').notNull(),
    /** Only set for types that target one network. */
    platform: contentPlatformEnum('platform'),
    status: contentStatusEnum('status').notNull().default('generating'),

    title: text('title'),
    body: jsonb('body').$type<ContentBody | Record<string, never>>().notNull().default({}),
    /** What the customer asked for, in their words. */
    brief: text('brief'),
    /** Overrides the brand's own voice for this piece only. */
    tone: text('tone'),
    language: localeEnum('language').notNull().default('en'),

    creditsReserved: integer('credits_reserved').notNull().default(0),
    creditsCharged: integer('credits_charged').notNull().default(0),

    /** Same provenance pair the branding assets carry. */
    modelUsed: text('model_used'),
    promptVersion: text('prompt_version'),
    error: text('error'),

    /*
     * Version lineage. Regenerating writes a new row rather than overwriting,
     * so a customer never loses a version to a worse one — and each row keeps
     * its own ledger keys.
     */
    rootId: uuid('root_id').notNull(),
    parentId: uuid('parent_id'),
    version: integer('version').notNull().default(1),
    isLatest: boolean('is_latest').notNull().default(true),
    /** Set when a human changes the text. A version means the model wrote it. */
    editedAt: timestamp('edited_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('content_items_org_created_idx').on(t.organizationId, t.createdAt),
    index('content_items_project_created_idx').on(t.projectId, t.createdAt),
    index('content_items_root_idx').on(t.rootId, t.version),
    /** The sweeper that refunds holds left behind by a crashed request. */
    index('content_items_status_created_idx').on(t.status, t.createdAt),
  ],
)

/* -------------------------------------------------------------------------- */
/*                                Inferred types                               */
/* -------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect
export type Organization = typeof organizations.$inferSelect
export type Member = typeof members.$inferSelect
export type Plan = typeof plans.$inferSelect
export type CreditPack = typeof creditPacks.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
export type CreditTransaction = typeof creditTransactions.$inferSelect
export type Order = typeof orders.$inferSelect
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type BrandingAsset = typeof brandingAssets.$inferSelect
export type WebsiteAsset = typeof websiteAssets.$inferSelect
export type SocialMediaAsset = typeof socialMediaAssets.$inferSelect
export type GeneratedFile = typeof generatedFiles.$inferSelect
export type GenerationJob = typeof generationJobs.$inferSelect
export type AiUsage = typeof aiUsage.$inferSelect
export type AssistantThread = typeof assistantThreads.$inferSelect
export type AssistantMessage = typeof assistantMessages.$inferSelect
export type ContentItem = typeof contentItems.$inferSelect
export type NewContentItem = typeof contentItems.$inferInsert
