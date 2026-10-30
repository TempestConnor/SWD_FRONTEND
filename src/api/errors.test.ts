import { describe, expect, it } from 'vitest'
import { ApiError, toApiError, UNKNOWN_ERROR, unwrap } from './errors'

describe('toApiError', () => {
  it('reads errorCode and detail from Problem Details', () => {
    const error = toApiError(409, { status: 409, detail: 'Game already started', errorCode: 'ONLINE_GAME_ALREADY_STARTED' })

    expect(error.status).toBe(409)
    expect(error.errorCode).toBe('ONLINE_GAME_ALREADY_STARTED')
    expect(error.detail).toBe('Game already started')
    expect(error.violations).toEqual([])
  })

  it('reads field violations from a validation failure', () => {
    const error = toApiError(400, {
      errorCode: 'VALIDATION_FAILED',
      violations: [{ field: 'email', message: 'is required' }, { bogus: true }],
    })

    expect(error.violations).toEqual([{ field: 'email', message: 'is required' }])
  })

  it.each([undefined, null, 'Bad Gateway', { detail: 'no code' }])('falls back to UNKNOWN_ERROR for %j', (body) => {
    const error = toApiError(502, body)

    expect(error.errorCode).toBe(UNKNOWN_ERROR)
    expect(error.status).toBe(502)
  })
})

describe('unwrap', () => {
  it('returns data for a successful response', () => {
    expect(unwrap({ data: { id: 1 }, response: new Response(null, { status: 200 }) })).toEqual({ id: 1 })
  })

  it('throws an ApiError for a failed response', () => {
    const result = { error: { errorCode: 'ACCOUNT_NOT_FOUND' }, response: new Response(null, { status: 404 }) }

    expect(() => unwrap(result)).toThrow(ApiError)
    expect(() => unwrap(result)).toThrow('404 ACCOUNT_NOT_FOUND')
  })
})
