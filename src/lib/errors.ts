/**
 * Application error taxonomy.
 *
 * Every expected failure in the app is an `AppError` with a stable `code`.
 * Unexpected failures stay as raw Errors so they surface loudly in Sentry
 * rather than being quietly rendered as a friendly message.
 */

export type ErrorCode =
  // auth / access
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'EMAIL_NOT_VERIFIED'
  | 'NO_ORG'
  // billing / entitlements
  | 'INSUFFICIENT_CREDITS'
  | 'FEATURE_LOCKED'
  | 'SEAT_LIMIT'
  // generation
  | 'GENERATION_IN_PROGRESS'
  | 'AI_PROVIDER_ERROR'
  | 'RATE_LIMITED'

const DEFAULT_STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  EMAIL_NOT_VERIFIED: 403,
  NO_ORG: 403,
  INSUFFICIENT_CREDITS: 402,
  FEATURE_LOCKED: 403,
  SEAT_LIMIT: 403,
  GENERATION_IN_PROGRESS: 409,
  AI_PROVIDER_ERROR: 502,
  RATE_LIMITED: 429,
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number

  constructor(code: ErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status ?? DEFAULT_STATUS[code]
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
