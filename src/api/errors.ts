export type Violation = { field: string; message: string }

/** A failed API call, parsed from the backend's RFC 9457 Problem Details body. */
export class ApiError extends Error {
  readonly status: number
  readonly errorCode: string
  readonly detail: string | undefined
  readonly violations: Violation[]

  constructor(status: number, errorCode: string, detail?: string, violations: Violation[] = []) {
    super(`${status} ${errorCode}`)
    this.name = 'ApiError'
    this.status = status
    this.errorCode = errorCode
    this.detail = detail
    this.violations = violations
  }
}

/** Used when the body is not Problem Details (proxy error, HTML page, network-level failure). */
export const UNKNOWN_ERROR = 'UNKNOWN_ERROR'

export function toApiError(status: number, body: unknown): ApiError {
  if (!isRecord(body) || typeof body.errorCode !== 'string') {
    return new ApiError(status, UNKNOWN_ERROR)
  }

  const detail = typeof body.detail === 'string' ? body.detail : undefined
  const violations = Array.isArray(body.violations) ? body.violations.filter(isViolation) : []

  return new ApiError(status, body.errorCode, detail, violations)
}

type FetchResult<T> = { data?: T; error?: unknown; response: Response }

/** Returns the data of an openapi-fetch result, or throws an ApiError, so TanStack Query sees failures. */
export function unwrap<T>(result: FetchResult<T>): T {
  if (result.response.ok) {
    return result.data as T
  }

  throw toApiError(result.response.status, result.error)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isViolation(value: unknown): value is Violation {
  return isRecord(value) && typeof value.field === 'string' && typeof value.message === 'string'
}
