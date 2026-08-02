import 'server-only'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { env } from '@/lib/env'
import * as schema from './schema'

/**
 * A single pooled client is reused across hot reloads in development so that
 * every save does not leak another set of connections into Postgres.
 */
const globalForDb = globalThis as unknown as { client?: postgres.Sql }

const client =
  globalForDb.client ??
  postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    prepare: false, // required when connecting through a transaction pooler
  })

if (process.env.NODE_ENV !== 'production') globalForDb.client = client

export const db = drizzle(client, { schema })
export { schema }
