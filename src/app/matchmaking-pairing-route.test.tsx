import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { saveSession } from '../api/session'
import { getCurrentAccount, type Account, type AuthToken } from '../features/auth/api'
import { cancelQueue, heartbeatQueue, joinQueue, type QueueRequest } from '../features/matchmaking/api'
import { getOnlineGame, heartbeatOnlineGame, type OnlineGame } from '../features/online-game/api'
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
vi.mock('../features/online-game/api', () => ({
  getOnlineGame: vi.fn(),
  markReady: vi.fn(),
  cancelOnlineGame: vi.fn(),
  heartbeatOnlineGame: vi.fn(),
  makeMove: vi.fn(),
  getMoves: vi.fn(),
  resignOnlineGame: vi.fn(),
  voteToAbandon: vi.fn(),
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

const joinedAt = '2026-10-31T10:00:00.000Z'
const queued: QueueRequest = {
  id: 5,
  status: 'QUEUED',
  mode: 'CLASSICAL',
  variant: 'STANDARD',
  ratingAtEntry: 1200,
  joinedAt,
  heartbeatAt: joinedAt,
  heartbeatIntervalSeconds: 10,
}
const matched: QueueRequest = { ...queued, status: 'MATCHED', leftAt: '2026-10-31T10:00:08.000Z', gameId: 42 }

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const pendingGame: OnlineGame = {
  id: 42,
  source: 'MATCHMAKING',
  status: 'PENDING',
  rated: true,
  mode: 'CLASSICAL',
  variant: 'STANDARD',
  clock: { enabled: true, initialMinutes: 30, incrementSeconds: 10 },
  white: { accountId: 7, displayName: 'Alex', ready: false },
  black: { accountId: 8, displayName: 'Sam', ready: false },
  viewerColor: 'BLACK',
  createdAt: '2026-10-31T10:00:08Z',
  readyDeadlineAt: '2026-10-31T10:03:08Z',
  initialFen: startFen,
  currentFen: startFen,
  lastPly: 0,
}

function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: ['/', path], initialIndex: 1 })
  renderWithClient(
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>,
  )
  return { router, user: userEvent.setup() }
}

beforeEach(() => {
  vi.mocked(getCurrentAccount).mockResolvedValue(account)
  vi.mocked(heartbeatQueue).mockRejectedValue(new ApiError(404, 'QUEUE_REQUEST_NOT_FOUND'))
  vi.mocked(getOnlineGame).mockResolvedValue(pendingGame)
  vi.mocked(heartbeatOnlineGame).mockResolvedValue(pendingGame)
})

afterEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

describe('matchmaking pairing route', () => {
  it('brings a paired player to the pending board, replacing the queue page in history', async () => {
    saveSession(token)
    vi.mocked(joinQueue).mockResolvedValue(queued)
    vi.mocked(cancelQueue).mockResolvedValue(matched)
    const { router, user } = renderApp('/play')

    await user.click(await screen.findByRole('button', { name: 'Find opponent' }))
    await user.click(await screen.findByRole('button', { name: 'Leave queue' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/games/42'))
    expect(await screen.findByText('White: Alex')).toBeInTheDocument()
    expect(getOnlineGame).toHaveBeenCalledWith(42)
    expect(screen.getByText('Black: Sam')).toBeInTheDocument()

    await router.navigate(-1)
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})
