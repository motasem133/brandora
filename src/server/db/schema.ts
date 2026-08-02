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

export const websiteTemplateEnum = pgEnum('website_template', ['modern', 'minimal', 'luxury'])

export const fileKindEnum = pgEnum('file_kind', [
  'logo_raster',
  'logo_svg',
  'favicon',
  'social_avatar',
  'letterhead',
  'brand_kit_zip',
  'upload',
])

export const jobTriggerEnum = pgEnum('job_trigger', ['initial', 'retry_section', 'regenerate'])
export const jobStatusEnum = pgEnum('job_status', ['queued', 'running', 'completed', 'failed', 'partial'])

export const aiFeatureEnum = pgEnum('ai_feature', [
  'branding',
  'website',
  'social',
  'logo',
  'assistant',
  'vectorize',
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
    targetAudience: text('target_audience').notNull(),
    brandStyle: brandStyleEnum('brand_style').notNull(),
    /** Array of hex strings, max 3. */
    preferredColors: jsonb('preferred_colors').$type<string[]>().notNull().default([]),

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

    template: websiteTemplateEnum('template').notNull().default('modern'),
    /** Record<pageKey, Block[]> — see the Block union in §5. */
    pages: jsonb('pages').$type<Record<string, unknown[]>>().notNull().default({}),
    customStyles: jsonb('custom_styles').$type<Record<string, string>>().notNull().default({}),

    isPublished: boolean('is_published').notNull().default(false),
    subdomain: text('subdomain').unique(),
    customDomain: text('custom_domain').unique(),
    publishedAt: timestamp('published_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('website_assets_subdomain_idx').on(t.subdomain)],
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
