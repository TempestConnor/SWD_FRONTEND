import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { getCurrentAccount, signIn, signUp, type Account, type AuthToken } from './api'

vi.mock('../../api/client', () => ({ api: { GET: vi.fn(), POST: vi.fn() } }))

const account: Account = {
  id: 7,
  email: 'alex@example.com',
  displayName: 'Alex',
  signupSkill: 'INTERMEDIATE',
  roles: ['PLAYER'],
  ratings: [{ mode: 'CLASSICAL', rating: 800 }],
}
const token: AuthToken = { accessToken: 'jwt', tokenType: 'Bearer', expiresAt: '2999-01-01T00:00:00Z', account }

function ok(data: unknown, status = 200) {
  return { data, response: new Response(null, { status }) } as never
}

function problem(status: number, body: unknown) {
  return { error: body, response: new Response(null, { status }) } as never
}

afterEach(() => {
  vi.resetAllMocks()
})

describe('auth api', () => {
  it('signs up through POST /api/accounts/signup', async () => {
    vi.mocked(api.POST).mockResolvedValue(ok(token, 201))
    const body = { email: 'alex@example.com', password: 'secret123', displayName: 'Alex', signupSkill: 'INTERMEDIATE' }

    await expect(signUp(body)).resolves.toEqual(token)
    expect(api.POST).toHaveBeenCalledWith('/api/accounts/signup', { body })
  })

  it('signs in through POST /api/accounts/signin', async () => {
    vi.mocked(api.POST).mockResolvedValue(ok(token))
    const body = { email: 'alex@example.com', password: 'secret123' }

    await expect(signIn(body)).resolves.toEqual(token)
    expect(api.POST).toHaveBeenCalledWith('/api/accounts/signin', { body })
  })

  it('reads the current account through GET /api/accounts/me', async () => {
    vi.mocked(api.GET).mockResolvedValue(ok(account))

    await expect(getCurrentAccount()).resolves.toEqual(account)
    expect(api.GET).toHaveBeenCalledWith('/api/accounts/me')
  })

  it('throws an ApiError carrying the errorCode on failure', async () => {
    vi.mocked(api.POST).mockResolvedValue(problem(409, { status: 409, errorCode: 'EMAIL_ALREADY_REGISTERED' }))

    await expect(
      signUp({ email: 'ALEX@example.com', password: 'secret123', displayName: 'Alex2', signupSkill: 'BEGINNER' }),
    ).rejects.toMatchObject({ name: 'ApiError', status: 409, errorCode: 'EMAIL_ALREADY_REGISTERED' })
  })
})
