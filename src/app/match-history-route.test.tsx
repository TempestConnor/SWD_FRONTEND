import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../api/session'
import { getCurrentAccount, type Account, type AuthToken } from '../features/auth/api'
import {
  getHistoryGame,
  getMatchHistory,
  type HistoryGame,
  type MatchHistoryEntry,
  type MatchHistoryPage,
} from '../features/match-history/api'
import { renderWithClient } from '../test/utils'
import { routes } from './router'
import { SessionProvider } from './SessionProvider'

vi.mock('../features/auth/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../features/auth/api')>()),
  signIn: vi.fn(),
  signUp: vi.fn(),
  getCurrentAccount: vi.fn(),
}))
vi.mock('../features/match-history/api', () => ({
  getMatchHistory: vi.fn(),
  getHistoryGame: vi.fn(),
  MATCH_HISTORY_PAGE_SIZE: 20,
}))

const account: Account = {
  id: 7,
  email: 'alex@example.com',
  displayName: 'Alex',
  signupSkill: 'INTERMEDIATE',
  roles: ['PLAYER'],
  ratings: [{ mode: 'CLASSICAL', rating: 812 }],
}
const token: AuthToken = { accessToken: 'jwt', tokenType: 'Bearer', expiresAt: '2999-01-01T00:00:00Z', account }

const entry: MatchHistoryEntry = {
  gameId: 42,
  source: 'INVITE',
  rated: true,
  mode: 'CLASSICAL',
  variant: 'STANDARD',
  clock: { enabled: true, initialMinutes: 30, incrementSeconds: 10 },
  viewerColor: 'WHITE',
  opponent: { accountId: 8, displayName: 'Sam' },
  result: 'WIN',
  outcome: 'WHITE_WIN',
  terminationReason: 'RESIGNATION',
  startedAt: '2026-10-31T10:06:00Z',
  endedAt: '2026-10-31T10:20:00Z',
  plyCount: 0,
  ratingChange: { ratingBefore: 800, ratingDelta: 12, ratingAfter: 812, kFactor: 20 },
}
const detail: HistoryGame = {
  gameId: 42,
  source: 'INVITE',
  rated: true,
  mode: 'CLASSICAL',
  variant: 'STANDARD',
  clock: { enabled: true, initialMinutes: 30, incrementSeconds: 10 },
  viewerColor: 'WHITE',
  result: 'WIN',
  white: { accountId: 7, displayName: 'Alex' },
  black: { accountId: 8, displayName: 'Sam' },
  whiteRatingChange: { ratingBefore: 800, ratingDelta: 12, ratingAfter: 812, kFactor: 20 },
  blackRatingChange: { ratingBefore: 820, ratingDelta: -12, ratingAfter: 808, kFactor: 20 },
  outcome: 'WHITE_WIN',
  terminationReason: 'RESIGNATION',
  startedAt: '2026-10-31T10:06:00Z',
  endedAt: '2026-10-31T10:20:00Z',
  initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  plyCount: 0,
  moves: [],
}
const threePages = (page: number): MatchHistoryPage => ({
  content: [entry],
  page,
  size: 20,
  totalElements: 41,
  totalPages: 3,
  last: page === 2,
})

function renderApp(path: string, signedIn = true) {
  if (signedIn) {
    saveSession(token)
  }
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  renderWithClient(
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>,
  )
  return { router, user: userEvent.setup() }
}

beforeEach(() => {
  vi.mocked(getCurrentAccount).mockResolvedValue(account)
  vi.mocked(getMatchHistory).mockImplementation(async (page) => threePages(page))
  vi.mocked(getHistoryGame).mockResolvedValue(detail)
})

afterEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

describe('match history routes', () => {
  it('offers a signed-in player a header link to their match history', async () => {
    const { router, user } = renderApp('/')

    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Match history' }))

    expect(router.state.location.pathname).toBe('/history')
    expect(await screen.findByRole('heading', { name: 'Match history' })).toBeInTheDocument()
    expect(await screen.findByText('vs Sam')).toBeInTheDocument()
  })

  it('does not offer match history to a guest', async () => {
    renderApp('/', false)

    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Match history' })).not.toBeInTheDocument()
  })

  it('sends a guest who opens the history to sign in', async () => {
    const { router } = renderApp('/history', false)

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/signin')
    expect(getMatchHistory).not.toHaveBeenCalled()
  })

  it('opens the first page by default', async () => {
    renderApp('/history')

    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument()
    expect(getMatchHistory).toHaveBeenCalledWith(0)
  })

  it('keeps the page in the address so it survives a refresh', async () => {
    const { router, user } = renderApp('/history?page=2')

    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument()
    expect(getMatchHistory).toHaveBeenCalledWith(1)

    await user.click(screen.getByRole('button', { name: 'Next page' }))

    expect(await screen.findByText('Page 3 of 3')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?page=3')
    expect(getMatchHistory).toHaveBeenCalledWith(2)
  })

  it('falls back to the first page for a page number that makes no sense', async () => {
    renderApp('/history?page=abc')

    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument()
    expect(getMatchHistory).toHaveBeenCalledWith(0)
    expect(getMatchHistory).not.toHaveBeenCalledWith(Number.NaN)
  })

  it('opens a game’s detail from the list', async () => {
    const { router, user } = renderApp('/history')

    await user.click(await screen.findByRole('link', { name: 'View game against Sam' }))

    expect(router.state.location.pathname).toBe('/history/42')
    expect(await screen.findByText('White: Alex')).toBeInTheDocument()
    expect(getHistoryGame).toHaveBeenCalledWith(42)
  })

  it('sends a guest who opens a game’s detail to sign in', async () => {
    const { router } = renderApp('/history/42', false)

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/signin')
    expect(getHistoryGame).not.toHaveBeenCalled()
  })
})
