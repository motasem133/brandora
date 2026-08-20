/**
 * Telling one kind of failed model call from another.
 *
 * Its own module, and deliberately so: `run.ts` builds an OpenRouter client at
 * import time and therefore drags in the validated environment, which made
 * these two pure functions impossible to test without a populated `.env`. This
 * repo has already shipped one defect that hid behind exactly that — two tests
 * that were only ever green because of what happened to be on one machine. A
 * classifier with no imports is a classifier CI can hold to account.
 */

/**
 * Could not reach the provider at all, as opposed to being answered badly.
 *
 * Matched on the codes the runtime actually raises — DNS, refused, reset,
 * timed out — rather than on message text, which changes between Node
 * versions and SDK releases. `AI_APICallError` wraps the cause, so the chain
 * is walked.
 */
export function isNetworkError(error: unknown): boolean {
  const CODES = new Set([
    'ENOTFOUND',
    'ECONNREFUSED',
    'ECONNRESET',
    'EAI_AGAIN',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_SOCKET',
  ])

  for (let current = error, depth = 0; current && depth < 5; depth += 1) {
    const node = current as { code?: unknown; errors?: unknown[]; cause?: unknown }

    if (typeof node.code === 'string' && CODES.has(node.code)) return true
    // fetch wraps its attempts in an AggregateError.
    if (Array.isArray(node.errors) && node.errors.some((inner) => isNetworkError(inner))) return true

    current = node.cause
  }

  return false
}

/**
 * Ran out of time, as opposed to answering badly.
 *
 * `AbortSignal.timeout` rejects with a `DOMException` named `TimeoutError`, and
 * an abort raised any other way is an `AbortError`; neither carries a `code`,
 * which is why `isNetworkError` does not — and must not — match them. A cut-off
 * call is not a network failure: retrying the whole chain after a wait is the
 * right answer to a DNS blip and the wrong answer to a model that is simply
 * slow, because every model in the chain would be given the same too-short
 * deadline a second time.
 *
 * The cause chain is walked because the AI SDK wraps the abort in its own
 * error, and the name is matched rather than `instanceof DOMException` so this
 * holds wherever the SDK re-creates the error as a plain `Error`.
 */
export function isTimeoutError(error: unknown): boolean {
  const NAMES = new Set(['TimeoutError', 'AbortError'])

  for (let current = error, depth = 0; current && depth < 5; depth += 1) {
    const node = current as { name?: unknown; errors?: unknown[]; cause?: unknown }

    if (typeof node.name === 'string' && NAMES.has(node.name)) return true
    if (Array.isArray(node.errors) && node.errors.some((inner) => isTimeoutError(inner))) return true

    current = node.cause
  }

  return false
}
