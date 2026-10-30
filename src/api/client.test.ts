import createClient from 'openapi-fetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authMiddleware } from './client'
import type { paths } from './schema'
import { getSession, saveSession } from './session'

const token = { accessToken: 'jwt', expiresAt: '2999-01-01T00:00:00Z', account: { id: 1 } }

function clientReturning(status: number) {
  const fetchMock = vi.fn(async (_request: Request) => new Response('{}', { status, headers: { 'Content-Type': 'application/json' } }))
  const client = createClient<paths>({ baseUrl: 'http://localhost', fetch: fetchMock })
  client.use(authMiddleware)
  return { client, fetchMock }
}

afterEach(() => {
  localStorage.clear()
})

describe('authMiddleware', () => {
  it('sends no Authorization header for guests', async () => {
    const { client, fetchMock } = clientReturning(200)

    await client.GET('/api/accounts/me')

    expect(fetchMock.mock.calls[0][0].headers.has('Authorization')).toBe(false)
  })

  it('sends the bearer token when signed in', async () => {
    saveSession(token)
    const { client, fetchMock } = clientReturning(200)

    await client.GET('/api/accounts/me')

    expect(fetchMock.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer jwt')
  })

  it('clears the session when the token is rejected', async () => {
    saveSession(token)
    const { client } = clientReturning(401)

    await client.GET('/api/accounts/me')

    expect(getSession()).toBeNull()
  })
})
