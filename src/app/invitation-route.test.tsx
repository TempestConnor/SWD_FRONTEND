import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../api/session'
import { getCurrentAccount, signIn, type Account, type AuthToken } from '../features/auth/api'
import { claimInvitation, getInvitation, type Invitation } from '../features/invitation/api'
import { INVITATION_STORAGE_KEY } from '../features/invitation/storage'
import { getOnlineGame, type OnlineGame } from '../features/online-game/api'
import { renderWithClient } from '../test/utils'
import { routes } from './router'
import { SessionProvider } from './SessionProvider'

vi.mock('../features/auth/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../features/auth/api')>()),
  signIn: vi.fn(),
  signUp: vi.fn(),
  getCurrentAccount: vi.fn(),
}))
vi.mock('../features/invitation/api', () => ({
  createInvitation: vi.fn(),
  getInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
  claimInvitation: vi.fn(),
}))
vi.mock('../features/online-game/api', () => ({ getOnlineGame: vi.fn() }))

const account: Account = {
  id: 8,
  email: 'sam@example.com',
  displayName: 'Sam',
  signupSkill: 'INTERMEDIATE',
  roles: ['PLAYER'],
  ratings: [{ mode: 'CLASSICAL', rating: 800 }],
}
const token: AuthToken = { accessToken: 'jwt', tokenType: 'Bearer', expiresAt: '2999-01-01T00:00:00Z', account }

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const game: OnlineGame = {
  id: 42,
  source: 'INVITE',
  status: 'PENDING',
  rated: true,
  clock: { enabled: true, initialMinutes: 30, incrementSeconds: 10 },
  white: { accountId: 7, displayName: 'Alex', ready: false },
  black: { accountId: 8, displayName: 'Sam', ready: false },
  viewerColor: 'BLACK',
  initialFen: startFen,
  currentFen: startFen,
  lastPly: 0,
}
const claimedInvitation: Invitation = {
  id: 3,
  status: 'CLAIMED',
  hostColor: 'WHITE',
  rated: true,
  clock: { enabled: true, initialMinutes: 30, incrementSeconds: 10 },
  createdAt: '2026-10-31T10:00:00Z',
  expiresAt: '2026-10-31T10:15:00Z',
  claimedAt: '2026-10-31T10:05:00Z',
  gameId: 42,
}

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
  vi.mocked(getOnlineGame).mockResolvedValue(game)
})

afterEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

describe('invitation routes', () => {
  it('offers a signed-in player to invite a friend from the header', async () => {
    saveSession(token)
    const { router, user } = renderApp('/')

    await user.click(await banner().findByRole('link', { name: 'Invite a friend' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/invite'))
    expect(await screen.findByRole('heading', { name: 'Invite a friend' })).toBeInTheDocument()
  })

  it('does not offer invitations to a guest and sends one who opens the invite page to sign in', async () => {
    const { router } = renderApp('/invite')

    await waitFor(() => expect(router.state.location.pathname).toBe('/signin'))
    expect(await banner().findByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(banner().queryByRole('link', { name: 'Invite a friend' })).not.toBeInTheDocument()
  })

  it('sends a guest who opens an invitation link to sign in and back to the link afterwards', async () => {
    vi.mocked(signIn).mockResolvedValue(token)
    const { router, user } = renderApp('/invite/tok_abc')

    await waitFor(() => expect(router.state.location.pathname).toBe('/signin'))
    await user.type(await screen.findByLabelText('Email'), 'sam@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/invite/tok_abc'))
    expect(await screen.findByRole('button', { name: 'Join game' })).toBeInTheDocument()
  })

  it('brings the joiner to the board after claiming the seat', async () => {
    saveSession(token)
    vi.mocked(claimInvitation).mockResolvedValue(game)
    const { router, user } = renderApp('/invite/tok_abc')

    await user.click(await screen.findByRole('button', { name: 'Join game' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/games/42'))
    expect(claimInvitation).toHaveBeenCalledWith('tok_abc')
    expect(await screen.findByText('White: Alex')).toBeInTheDocument()
    expect(screen.getByText('Black: Sam')).toBeInTheDocument()
  })

  it('brings the host to the board once the invitation is claimed', async () => {
    saveSession(token)
    sessionStorage.setItem(INVITATION_STORAGE_KEY, JSON.stringify({ id: 3, token: 'tok_abc' }))
    vi.mocked(getInvitation).mockResolvedValue(claimedInvitation)
    vi.mocked(getOnlineGame).mockResolvedValue({ ...game, viewerColor: 'WHITE' })
    const { router } = renderApp('/invite')

    await waitFor(() => expect(router.state.location.pathname).toBe('/games/42'))
    expect(await screen.findByText('You play White')).toBeInTheDocument()
  })

  it('shows an online game to a signed-in participant who opens its address', async () => {
    saveSession(token)
    renderApp('/games/42')

    expect(await screen.findByText('White: Alex')).toBeInTheDocument()
    expect(getOnlineGame).toHaveBeenCalledWith(42)
  })

  it('sends a guest who opens an online game to sign in', async () => {
    const { router } = renderApp('/games/42')

    await waitFor(() => expect(router.state.location.pathname).toBe('/signin'))
    expect(getOnlineGame).not.toHaveBeenCalled()
  })

  it('shows not found for a game address that is not a number', async () => {
    saveSession(token)
    renderApp('/games/abc')

    expect(await screen.findByRole('alert')).toHaveTextContent('This game was not found.')
    expect(getOnlineGame).not.toHaveBeenCalled()
  })
})
