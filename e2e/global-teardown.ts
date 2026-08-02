import { sql } from './fixtures/db'

/**
 * Closes the shared database pool once the whole run is finished.
 *
 * Per-file teardown closed a connection other spec files were still using,
 * which surfaced as CONNECTION_ENDED in whichever file happened to run last.
 */
export default async function globalTeardown() {
  await sql.end()
}
