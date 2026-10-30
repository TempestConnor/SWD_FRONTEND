import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../api/session'
import { getCurrentAccount, type Account, type AuthToken } from '../features/auth/api'
import {
  getMoves,
  getOnlineGame,
  heartbeatOnlineGame,
  resignOnlineGame,
  voteToAbandon,
  type OnlineGame,
} from '../features/online-game/api'
import { renderWithClient } from '../test/utils'
import { routes } from './router'
import { SessionProvider } from './SessionProvider'

vi.mock('../features/auth/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../features/auth/api')>()),
  signIn: vi.fn(),
  signUp: vi.fn(),
  getCurrentAccount: vi.fn(),
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

const withRating = (rating: number): Account => ({
  id: 7,
  email: 'alex@example.com',
  displayName: 'Alex',
  signupSkill: 'INTERMEDIATE',
  roles: ['PLAYER'],
  ratings: [{ mode: 'CLASSICAL', rating }],
})
const token: AuthToken = {
  accessToken: 'jwt',
  tokenType: 'Bearer',
  expiresAt: '2999-01-01T00:00:00Z',
  account: withRating(800),
}

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const startedAt = '2026-10-31T10:06:00Z'

/** White (Alex) is the viewer. */
const activeGame: OnlineGame = {
  id: 42,
  source: 'INVITE',
  status: 'ACTIVE',
  rated: true,
  mode: 'CLASSICAL',
  variant: 'STANDARD',
  clock: { enabled: true, initialMinutes: 30, incrementSeconds: 10 },
  white: { accountId: 7, displayName: 'Alex', ready: true, abandonVoted: false },
  black: { accountId: 8, displayName: 'Sam', ready: true, abandonVoted: false },
  viewerColor: 'WHITE',
  createdAt: '2026-10-31T10:05:00Z',
  readyDeadlineAt: '2026-10-31T10:08:00Z',
  startedAt,
  turnStartedAt: startedAt,
  initialFen: startFen,
  currentFen: startFen,
  lastPly: 0,
  whiteRemainingMs: 1_800_000,
  blackRemainingMs: 1_800_000,
}
const unratedGame: OnlineGame = { ...activeGame, rated: false }

const completed = (game: OnlineGame, outcome: string, terminationReason: string): OnlineGame => ({
  ...game,
  status: 'COMPLETED',
  outcome,
  terminationReason,
  endedAt: '2026-10-31T10:20:00Z',
})

function renderGamePage() {
  saveSession(token)
  const router = createMemoryRouter(routes, { initialEntries: ['/games/42'] })
  renderWithClient(
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>,
  )
  return { user: userEvent.setup() }
}

function banner() {
  return within(screen.getByRole('banner'))
}

/** Loads the page with the game running and the header showing the rating read before the game ended. */
async function renderActive(game: OnlineGame) {
  vi.mocked(getOnlineGame).mockResolvedValue(game)
  vi.mocked(heartbeatOnlineGame).mockResolvedValue(game)
  const rendered = renderGamePage()
  expect(await banner().findByText('Classical 800')).toBeInTheDocument()
  await screen.findByRole('button', { name: 'Resign' })
  return rendered
}

beforeEach(() => {
  vi.mocked(getMoves).mockResolvedValue([])
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  // The first read is the rating before the game ends; a read after the end returns what the server applied.
  vi.mocked(getCurrentAccount).mockResolvedValueOnce(withRating(800)).mockResolvedValue(withRating(788))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

describe('ratings after an online game', () => {
  it('shows the updated rating in the header once a rated game the viewer resigned has ended', async () => {
    vi.mocked(resignOnlineGame).mockResolvedValue(completed(activeGame, 'BLACK_WIN', 'RESIGNATION'))
    const { user } = await renderActive(activeGame)

    await user.click(screen.getByRole('button', { name: 'Resign' }))

    expect(await screen.findByText('You resigned. You lose.')).toBeInTheDocument()
    expect(await banner().findByText('Classical 788')).toBeInTheDocument()
  })

  it('tells the player their new rating when a rated game ends', async () => {
    vi.mocked(resignOnlineGame).mockResolvedValue(completed(activeGame, 'BLACK_WIN', 'RESIGNATION'))
    const { user } = await renderActive(activeGame)

    await user.click(screen.getByRole('button', { name: 'Resign' }))

    expect(await screen.findByText('Rated game. Your Classical rating is now 788.')).toBeInTheDocument()
  })

  it('updates the rating when a rated game ends on the opponent’s side, as seen by the heartbeat', async () => {
    vi.mocked(getCurrentAccount).mockReset()
    vi.mocked(getCurrentAccount).mockResolvedValueOnce(withRating(800)).mockResolvedValue(withRating(812))
    vi.mocked(getOnlineGame).mockResolvedValue(activeGame)
    // The opponent resigned; the viewer learns of it from the next ping.
    vi.mocked(heartbeatOnlineGame).mockResolvedValue(completed(activeGame, 'WHITE_WIN', 'RESIGNATION'))
    renderGamePage()

    expect(await screen.findByText('Your opponent resigned. You win.')).toBeInTheDocument()
    expect(await banner().findByText('Classical 812')).toBeInTheDocument()
    expect(await screen.findByText('Rated game. Your Classical rating is now 812.')).toBeInTheDocument()
  })

  it('says a rated draw leaves ratings unchanged', async () => {
    vi.mocked(getCurrentAccount).mockReset()
    vi.mocked(getCurrentAccount).mockResolvedValue(withRating(800))
    vi.mocked(voteToAbandon).mockResolvedValue({
      ...completed(activeGame, 'DRAW', 'MUTUAL_ABANDONMENT'),
      white: { ...activeGame.white, abandonVoted: true },
      black: { ...activeGame.black, abandonVoted: true },
    })
    const { user } = await renderActive({ ...activeGame, black: { ...activeGame.black, abandonVoted: true } })

    await user.click(screen.getByRole('button', { name: 'Agree to abandon' }))

    expect(
      await screen.findByText('Draws do not change ratings. Your Classical rating is 800.'),
    ).toBeInTheDocument()
    expect(banner().getByText('Classical 800')).toBeInTheDocument()
  })

  it('says an unrated game leaves ratings unchanged and keeps the header rating', async () => {
    vi.mocked(resignOnlineGame).mockResolvedValue(completed(unratedGame, 'BLACK_WIN', 'RESIGNATION'))
    const { user } = await renderActive(unratedGame)

    await user.click(screen.getByRole('button', { name: 'Resign' }))

    expect(await screen.findByText('This game was unrated, so ratings did not change.')).toBeInTheDocument()
    // Nothing can have changed, so the header is not re-read and still shows the rating from before.
    expect(banner().getByText('Classical 800')).toBeInTheDocument()
    expect(getCurrentAccount).toHaveBeenCalledTimes(1)
  })

  it('shows no rating note while the game is still in progress', async () => {
    await renderActive(activeGame)

    expect(screen.queryByText(/rating is (now )?\d+/)).not.toBeInTheDocument()
    expect(screen.queryByText(/ratings did not change/)).not.toBeInTheDocument()
  })

  it('shows no rating note for a game cancelled before it started', async () => {
    const cancelled: OnlineGame = { ...activeGame, status: 'CANCELLED', startedAt: undefined }
    vi.mocked(getOnlineGame).mockResolvedValue(cancelled)
    vi.mocked(heartbeatOnlineGame).mockResolvedValue(cancelled)
    renderGamePage()

    expect(await screen.findByText(/This game was cancelled before it started/)).toBeInTheDocument()
    expect(screen.queryByText(/Your Classical rating/)).not.toBeInTheDocument()
    await waitFor(() => expect(getCurrentAccount).toHaveBeenCalledTimes(1))
  })
})
