import 'server-only'

import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'

/**
 * Customer custom domains, via Vercel's Domains API.
 *
 * A Business-plan customer points `theircompany.com` at the project and Vercel
 * issues the certificate. The domain is stored on `website_assets.custom_domain`
 * and resolved by `proxy.ts`, which rewrites any unrecognised host into the
 * published-site route.
 *
 * Nothing here touches the domain's registration — Brandora never buys or
 * transfers a domain, it only attaches one the customer already owns.
 */

const API = 'https://api.vercel.com'

/** The CNAME target a customer points a subdomain at (e.g. www.theirs.com). */
export const CNAME_TARGET = 'cname.vercel-dns.com'

/** The A record an apex domain needs, since apexes cannot carry a CNAME. */
export const APEX_IP = '76.76.21.21'

export type DomainRecord = { type: 'A' | 'CNAME' | 'TXT'; name: string; value: string }

export type DomainStatus = {
  domain: string
  /** Vercel has confirmed ownership — the domain is attached to the project. */
  verified: boolean
  /** DNS still points somewhere else, so the domain will not serve the site. */
  misconfigured: boolean
  /** What the customer must add at their DNS host. */
  records: DomainRecord[]
}

export function isDomainsConfigured() {
  return Boolean(env.VERCEL_API_TOKEN && env.VERCEL_PROJECT_ID)
}

function credentials() {
  if (!env.VERCEL_API_TOKEN || !env.VERCEL_PROJECT_ID) {
    throw new AppError(
      'FEATURE_LOCKED',
      'Custom domains are not available on this deployment yet.',
    )
  }

  return { token: env.VERCEL_API_TOKEN, projectId: env.VERCEL_PROJECT_ID }
}

/** Team-scoped projects need the team on every request; personal ones must omit it. */
function withTeam(path: string) {
  if (!env.VERCEL_TEAM_ID) return path
  return `${path}${path.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(env.VERCEL_TEAM_ID)}`
}

async function vercelFetch<T>(
  path: string,
  init: RequestInit & { method: string },
): Promise<{ ok: true; data: T } | { ok: false; status: number; code: string; message: string }> {
  const { token } = credentials()

  const response = await fetch(`${API}${withTeam(path)}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    // Domain state is never worth a stale read.
    cache: 'no-store',
  })

  const body = (await response.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string }
  } & T

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      code: body.error?.code ?? 'unknown',
      message: body.error?.message ?? 'Vercel rejected the request.',
    }
  }

  return { ok: true, data: body as T }
}

/**
 * `theircompany.com` → apex, `shop.theircompany.com` → subdomain.
 *
 * The distinction decides which DNS record the customer is told to create: an
 * apex cannot carry a CNAME, so it needs an A record instead.
 */
function isApex(domain: string) {
  return domain.split('.').length === 2
}

function instructionsFor(domain: string): DomainRecord[] {
  if (isApex(domain)) {
    return [{ type: 'A', name: '@', value: APEX_IP }]
  }

  const [label] = domain.split('.')
  return [{ type: 'CNAME', name: label, value: CNAME_TARGET }]
}

/**
 * Attaches the domain to the Vercel project.
 *
 * Returns the DNS records the customer still has to create — attaching and
 * resolving are separate steps, and the domain does not serve traffic until
 * their DNS points here.
 */
export async function attachDomain(domain: string): Promise<DomainStatus> {
  const { projectId } = credentials()

  const result = await vercelFetch<{ verified?: boolean }>(
    `/v10/projects/${encodeURIComponent(projectId)}/domains`,
    { method: 'POST', body: JSON.stringify({ name: domain }) },
  )

  if (!result.ok) {
    /*
     * Already attached to *this* project is success, not failure: a retry after
     * a timeout, or a customer re-adding the domain they already added, should
     * land on the instructions rather than an error.
     */
    if (result.code === 'domain_already_in_use' || result.status === 409) {
      const existing = await domainStatus(domain)
      if (existing) return existing
    }

    if (result.code === 'forbidden' || result.status === 403) {
      throw new AppError(
        'VALIDATION',
        'That domain is already used by another Vercel project. Remove it there first.',
      )
    }

    throw new AppError('VALIDATION', result.message)
  }

  return {
    domain,
    verified: result.data.verified ?? false,
    // Freshly attached: DNS cannot already be pointing here.
    misconfigured: true,
    records: instructionsFor(domain),
  }
}

/**
 * Current state of an attached domain — whether Vercel has verified ownership
 * and whether DNS actually resolves here yet.
 */
export async function domainStatus(domain: string): Promise<DomainStatus | null> {
  const { projectId } = credentials()

  const attached = await vercelFetch<{ verified?: boolean }>(
    `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`,
    { method: 'GET' },
  )

  if (!attached.ok) {
    if (attached.status === 404) return null
    throw new AppError('VALIDATION', attached.message)
  }

  const config = await vercelFetch<{ misconfigured?: boolean }>(
    `/v6/domains/${encodeURIComponent(domain)}/config`,
    { method: 'GET' },
  )

  return {
    domain,
    verified: attached.data.verified ?? false,
    // A config lookup that fails is not proof the domain works.
    misconfigured: config.ok ? (config.data.misconfigured ?? true) : true,
    records: instructionsFor(domain),
  }
}

/**
 * Detaches the domain from the project.
 *
 * A 404 is treated as success — the goal is "not attached", and it already is.
 */
export async function detachDomain(domain: string): Promise<void> {
  const { projectId } = credentials()

  const result = await vercelFetch(
    `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`,
    { method: 'DELETE' },
  )

  if (!result.ok && result.status !== 404) {
    throw new AppError('VALIDATION', result.message)
  }
}
