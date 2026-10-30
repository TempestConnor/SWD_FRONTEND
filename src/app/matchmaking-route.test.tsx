import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { saveSession } from '../api/session'
import { getCurrentAccount, type Account, type AuthToken } from '../features/auth/api'
import { heartbeatQueue } from '../features/matchmaking/api'
import { renderWithClient } from '../test/utils'
import { routes } from './router'
import { SessionProvider } from './SessionProvider'

vi.mock('../features/auth/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../features/auth/api')>()),
  signIn: vi.fn(),
  signUp: vi.fn(),
  getCurrentAccount: vi.fn(),
}))
vi.mock('../features/matchmaking/api', () => ({
  joinQueue: vi.fn(),
  heartbeatQueue: vi.fn(),
  cancelQueue: vi.fn(),
}))

const account: Account = {
  id: 8,
  email: 'sam@example.com',
  displayName: 'Sam',
  signupSkill: 'INTERMEDIATE',
  roles: ['PLAYER'],
  ratings: [{ mode: 'CLASSICAL', rating: 1200 }],
}
const token: AuthToken = { accessToken: 'jwt', tokenType: 'Bearer', expiresAt: '2999-01-01T00:00:00Z', account }

function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  renderWithClient(
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>,
  )
  return { router, user: userEvent.setup() }
}

function banner() {
  return within(screen.getByRole('banner'))
}

beforeEach(() => {
  vi.mocked(getCurrentAccount).mockResolvedValue(account)
  vi.mocked(heartbeatQueue).mockRejectedValue(new ApiError(404, 'QUEUE_REQUEST_NOT_FOUND'))
})

afterEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

describe('matchmaking route', () => {
  it('offers a signed-in player to play online from the header', async () => {
    saveSession(token)
    const { router, user } = renderApp('/')

    await user.click(await banner().findByRole('link', { name: 'Play online' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/play'))
    expect(await screen.findByRole('heading', { name: 'Play online' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Find opponent' })).toBeInTheDocument()
  })

  it('does not offer matchmaking to a guest and sends one who opens the page to sign in', async () => {
    const { router } = renderApp('/play')

    await waitFor(() => expect(router.state.location.pathname).toBe('/signin'))
    expect(await banner().findByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(banner().queryByRole('link', { name: 'Play online' })).not.toBeInTheDocument()
    expect(heartbeatQueue).not.toHaveBeenCalled()
  })
})
