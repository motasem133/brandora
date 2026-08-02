import 'server-only'

import { sql } from 'drizzle-orm'

import { db } from '@/server/db'

/**
 * Platform-wide analytics.
 *
 * Written as SQL rather than assembled in application code: these are
 * aggregations over the whole dataset, and pulling rows into JavaScript to
 * reduce them would get slower exactly as the numbers get interesting.
 */

export type Range = 7 | 30 | 90

export async function getOverview() {
  const [row] = await db.execute<{
    users: number
    users_this_month: number
    orgs: number
    projects: number
    projects_completed: number
    projects_this_month: number
    active_subscriptions: number
    mrr_cents: number
    credits_outstanding: number
  }>(sql`
    SELECT
      (SELECT count(*) FROM users WHERE deleted_at IS NULL)::int AS users,
      (SELECT count(*) FROM users WHERE created_at > now() - interval '30 days')::int AS users_this_month,
      (SELECT count(*) FROM organizations)::int AS orgs,
      (SELECT count(*) FROM projects WHERE deleted_at IS NULL)::int AS projects,
      (SELECT count(*) FROM projects WHERE status = 'completed' AND deleted_at IS NULL)::int AS projects_completed,
      (SELECT count(*) FROM projects WHERE created_at > now() - interval '30 days' AND deleted_at IS NULL)::int AS projects_this_month,
      (SELECT count(*) FROM subscriptions WHERE status IN ('active','trialing'))::int AS active_subscriptions,
      -- Monthly recurring revenue, in cents, from currently active plans only.
      (SELECT coalesce(sum(p.price_monthly), 0) FROM subscriptions s
         JOIN plans p ON p.id = s.plan_id
         WHERE s.status IN ('active','trialing'))::int AS mrr_cents,
      -- Unspent credits are a liability: work already paid for, not yet done.
      (SELECT coalesce(sum(credit_balance), 0) FROM organizations)::int AS credits_outstanding
  `)

  return row
}

export async function getSubscriptionsByPlan() {
  const rows = await db.execute<{ name: string; slug: string; count: number; mrr_cents: number }>(sql`
    SELECT p.name, p.slug, count(s.id)::int AS count,
           (count(s.id) * p.price_monthly)::int AS mrr_cents
    FROM plans p
    LEFT JOIN subscriptions s ON s.plan_id = p.id AND s.status IN ('active','trialing')
    GROUP BY p.id, p.name, p.slug, p.price_monthly, p.sort_order
    ORDER BY p.sort_order
  `)
  return rows
}

/** Daily AI spend, split by provider, for the spend-over-time chart. */
export async function getSpendByDay(days: Range) {
  const rows = await db.execute<{ day: string; provider: string; spend: number; calls: number }>(sql`
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
           provider,
           sum(cost_usd)::float AS spend,
           count(*)::int AS calls
    FROM ai_usage
    WHERE created_at > now() - (${days} || ' days')::interval
    GROUP BY 1, 2
    ORDER BY 1
  `)
  return rows
}

/**
 * Spend by feature.
 *
 * The documented expectation is that images dominate at roughly 95%. If this
 * ever shows otherwise, either the prompts have bloated or something is
 * retrying in a loop.
 */
export async function getSpendByFeature(days: Range) {
  const rows = await db.execute<{ feature: string; spend: number; calls: number; share: number }>(sql`
    SELECT feature,
           sum(cost_usd)::float AS spend,
           count(*)::int AS calls,
           (sum(cost_usd) / nullif(sum(sum(cost_usd)) OVER (), 0) * 100)::float AS share
    FROM ai_usage
    WHERE created_at > now() - (${days} || ' days')::interval AND status = 'success'
    GROUP BY feature
    ORDER BY spend DESC
  `)
  return rows
}

/**
 * Per-model performance.
 *
 * Error rate is the early warning: a model that starts failing pushes work onto
 * its fallbacks, which costs more and reads as a quality drop long before
 * anyone reports it.
 */
export async function getModelLeaderboard(days: Range) {
  const rows = await db.execute<{
    model: string
    provider: string
    calls: number
    errors: number
    error_rate: number
    avg_latency_ms: number
    spend: number
    avg_cost: number
  }>(sql`
    SELECT model, provider,
           count(*)::int AS calls,
           count(*) FILTER (WHERE status <> 'success')::int AS errors,
           (count(*) FILTER (WHERE status <> 'success')::float / nullif(count(*), 0) * 100) AS error_rate,
           avg(latency_ms) FILTER (WHERE status = 'success') AS avg_latency_ms,
           sum(cost_usd)::float AS spend,
           (sum(cost_usd) / nullif(count(*) FILTER (WHERE status = 'success'), 0))::float AS avg_cost
    FROM ai_usage
    WHERE created_at > now() - (${days} || ' days')::interval
    GROUP BY model, provider
    ORDER BY spend DESC
  `)
  return rows
}

/** Cost per completed generation — the number pricing has to stay ahead of. */
export async function getCostPerGeneration(days: Range) {
  const rows = await db.execute<{ day: string; generations: number; spend: number; per_generation: number }>(sql`
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
           count(DISTINCT generation_job_id)::int AS generations,
           sum(cost_usd)::float AS spend,
           (sum(cost_usd) / nullif(count(DISTINCT generation_job_id), 0))::float AS per_generation
    FROM ai_usage
    WHERE created_at > now() - (${days} || ' days')::interval
      AND generation_job_id IS NOT NULL
    GROUP BY 1
    ORDER BY 1 DESC
  `)
  return rows
}

/**
 * Margin per organization.
 *
 * Revenue is the plan price; cost is what their generations actually consumed.
 * A customer whose cost exceeds their revenue is not a rounding error — they
 * are the reason to know this number before scaling.
 */
export async function getMarginByOrg(days: Range, limit = 20) {
  const rows = await db.execute<{
    id: string
    name: string
    plan: string | null
    revenue_cents: number
    cost: number
    margin: number
    credit_balance: number
  }>(sql`
    SELECT o.id, o.name,
           p.name AS plan,
           coalesce(p.price_monthly, 0)::int AS revenue_cents,
           coalesce(u.cost, 0)::float AS cost,
           (coalesce(p.price_monthly, 0) / 100.0 - coalesce(u.cost, 0))::float AS margin,
           o.credit_balance
    FROM organizations o
    LEFT JOIN subscriptions s ON s.organization_id = o.id AND s.status IN ('active','trialing')
    LEFT JOIN plans p ON p.id = s.plan_id
    LEFT JOIN (
      SELECT organization_id, sum(cost_usd) AS cost
      FROM ai_usage
      WHERE created_at > now() - (${days} || ' days')::interval
      GROUP BY organization_id
    ) u ON u.organization_id = o.id
    WHERE coalesce(u.cost, 0) > 0 OR p.id IS NOT NULL
    ORDER BY margin ASC
    LIMIT ${limit}
  `)
  return rows
}

export async function listUsers(params: { search?: string; status?: string; limit?: number }) {
  const search = params.search?.trim() ? `%${params.search.trim()}%` : null
  const status = params.status && params.status !== 'all' ? params.status : null

  const rows = await db.execute<{
    id: string
    name: string
    email: string
    role: string
    status: string
    email_verified: boolean
    created_at: string
    org_name: string | null
    projects: number
  }>(sql`
    SELECT u.id, u.name, u.email, u.role, u.status, u.email_verified, u.created_at,
           o.name AS org_name,
           (SELECT count(*) FROM projects pr
              WHERE pr.organization_id = o.id AND pr.deleted_at IS NULL)::int AS projects
    FROM users u
    LEFT JOIN members m ON m.user_id = u.id
    LEFT JOIN organizations o ON o.id = m.organization_id
    WHERE u.deleted_at IS NULL
      AND (${search}::text IS NULL OR u.email ILIKE ${search} OR u.name ILIKE ${search})
      AND (${status}::text IS NULL OR u.status = ${status})
    ORDER BY u.created_at DESC
    LIMIT ${params.limit ?? 50}
  `)
  return rows
}

export async function listAllProjects(params: { status?: string; limit?: number }) {
  const status = params.status && params.status !== 'all' ? params.status : null

  const rows = await db.execute<{
    id: string
    title: string
    status: string
    industry: string
    language: string
    created_at: string
    org_name: string
    cost: number
  }>(sql`
    SELECT p.id, p.title, p.status, p.industry, p.language, p.created_at,
           o.name AS org_name,
           coalesce((SELECT sum(cost_usd) FROM ai_usage a WHERE a.project_id = p.id), 0)::float AS cost
    FROM projects p
    JOIN organizations o ON o.id = p.organization_id
    WHERE p.deleted_at IS NULL
      AND (${status}::text IS NULL OR p.status = ${status})
    ORDER BY p.created_at DESC
    LIMIT ${params.limit ?? 50}
  `)
  return rows
}
