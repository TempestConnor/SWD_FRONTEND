import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearSession, getSession, saveSession, subscribeToSession } from './session'

const account = { id: 7, email: 'alex@example.com', displayName: 'Alex' }
const token = { accessToken: 'jwt', tokenType: 'Bearer', expiresAt: '2030-01-01T00:00:00Z', account }

afterEach(() => {
  localStorage.clear()
})

describe('session', () => {
  it('returns null when nothing is stored', () => {
    expect(getSession()).toBeNull()
  })

  it('round-trips a saved session', () => {
    saveSession(token)

    expect(getSession(new Date('2029-01-01T00:00:00Z'))).toEqual({
      accessToken: 'jwt',
      expiresAt: '2030-01-01T00:00:00Z',
      account,
    })
  })

  it('drops the session once expiresAt has passed', () => {
    saveSession(token)

    expect(getSession(new Date('2030-01-01T00:00:00Z'))).toBeNull()
    expect(localStorage.length).toBe(0)
  })

  it.each(['not json', '{"accessToken":1}', '{"accessToken":"a","expiresAt":"never","account":{}}'])(
    'ignores corrupt stored value %s',
    (raw) => {
      localStorage.setItem('chess.session.v1', raw)

      expect(getSession()).toBeNull()
    },
  )

  it('rejects a sign-in response without a token', () => {
    expect(() => saveSession({ ...token, accessToken: undefined })).toThrow()
  })

  it('notifies subscribers on save and clear', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToSession(listener)

    saveSession(token)
    clearSession()
    unsubscribe()
    saveSession(token)

    expect(listener).toHaveBeenCalledTimes(2)
  })
})
