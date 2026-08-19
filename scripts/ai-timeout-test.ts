import assert from 'node:assert/strict'

import { isNetworkError, isTimeoutError } from '../src/server/ai/failures'

/**
 * Telling "ran out of time" apart from "answered badly".
 *
 * A customer's brand came out completely empty. Branding is the first section
 * and every other one is built on it, so when all three models in its chain hit
 * the same sixty-second cap in turn, the run produced nothing at all — and
 * `ai_usage` recorded the three attempts as `error`, the same word it uses for
 * a model that returned malformed JSON. The one question worth asking of that
 * table, "are we cutting calls off too early?", was the one it could not
 * answer, so diagnosing it meant reading the source.
 *
 * These are the rules that keep the two apart, and they break quietly. Nothing
 * fails to compile if a timeout starts being classified as an error again; the
 * only symptom is a column that lies, months later, to whoever is trying to set
 * the cap from real data.
 *
 * The distinction from `isNetworkError` is the load-bearing one. A connection
 * failure re-runs the whole chain after a backoff, which is right for a DNS
 * blip and wrong for a model that is simply slow — retrying would hand every
 * model in the chain the same too-short deadline a second time and burn the
 * budget doing it. So a timeout must match `isTimeoutError` and must *not*
 * match `isNetworkError`.
 *
 * No database, no network and no environment. Usage: pnpm test:ai-timeout
 */

/** A real rejection from `AbortSignal.timeout`, not a hand-made stand-in. */
async function realAbortRejection(): Promise<unknown> {
  try {
    const signal = AbortSignal.timeout(30)
    await new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason))
      setTimeout(resolve, 5_000)
    })
    return null
  } catch (error) {
    return error
  }
}

async function main() {
  const abort = await realAbortRejection()

  /*
   * Asserted rather than assumed. The whole classifier rests on the runtime
   * naming this rejection `TimeoutError`, which is a detail of the platform
   * and not of this codebase — if a Node release ever changes it, this is the
   * line that says so instead of the column quietly going wrong.
   */
  assert.equal((abort as Error)?.name, 'TimeoutError', 'AbortSignal.timeout no longer raises TimeoutError')

  assert.equal(isTimeoutError(abort), true, 'a real abort must read as a timeout')
  assert.equal(isNetworkError(abort), false, 'a timeout must not trigger the network backoff')

  // The AI SDK does not hand back the abort bare; it wraps it.
  const wrapped = new Error('Failed after 2 attempts', { cause: abort })
  assert.equal(isTimeoutError(wrapped), true, 'an SDK-wrapped abort must read as a timeout')

  // fetch raises its parallel attempts as an AggregateError.
  const aggregate = new AggregateError([new Error('unrelated'), abort], 'all failed')
  assert.equal(isTimeoutError(aggregate), true, 'an aggregate containing an abort must read as a timeout')

  // An abort raised any other way — a cancelled request rather than a deadline.
  const cancelled = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
  assert.equal(isTimeoutError(cancelled), true, 'an AbortError must read as a timeout')

  /*
   * The other direction, which is what stops this from being a classifier that
   * simply says yes. A network failure must keep going down the backoff path,
   * and a schema rejection must stay neither.
   */
  const dns = Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' })
  assert.equal(isNetworkError(dns), true, 'a DNS failure is still a network error')
  assert.equal(isTimeoutError(dns), false, 'a DNS failure must not read as a timeout')

  const schema = new Error('response did not match schema')
  assert.equal(isTimeoutError(schema), false, 'a schema rejection is not a timeout')
  assert.equal(isNetworkError(schema), false, 'a schema rejection is not a network error')

  // A cause chain deep enough to matter, and one deeper than the walk allows.
  const nested = new Error('a', { cause: new Error('b', { cause: new Error('c', { cause: abort }) }) })
  assert.equal(isTimeoutError(nested), true, 'the cause chain must be walked')

  console.log('ai timeout classification: all checks passed')
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
