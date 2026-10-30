import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/errors'
import { pieceOn } from '../../../test/board'
import { renderWithClient } from '../../../test/utils'
import { getOnlineGame, type OnlineGame as OnlineGameData } from '../api'
import { OnlineGame } from './OnlineGame'

vi.mock('../api', () => ({ getOnlineGame: vi.fn() }))

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const pendingGame: OnlineGameData = {
  id: 42,
  source: 'INVITE',
  status: 'PENDING',
  rated: true,
  mode: 'CLASSICAL',
  variant: 'STANDARD',
  clock: { enabled: true, initialMinutes: 30, incrementSeconds: 10 },
  white: { accountId: 7, displayName: 'Alex', ready: false },
  black: { accountId: 8, displayName: 'Sam', ready: false },
  viewerColor: 'BLACK',
  createdAt: '2026-10-31T10:05:00Z',
  readyDeadlineAt: '2026-10-31T10:08:00Z',
  initialFen: startFen,
  currentFen: startFen,
  lastPly: 0,
  whiteRemainingMs: 1_800_000,
  blackRemainingMs: 1_800_000,
}

function renderGame(gameId = 42) {
  return { user: userEvent.setup(), ...renderWithClient(<OnlineGame gameId={gameId} />) }
}

afterEach(() => {
  vi.resetAllMocks()
})

describe('online game board after a claim', () => {
  it('loads the game by id and shows the starting position', async () => {
    vi.mocked(getOnlineGame).mockResolvedValue(pendingGame)

    renderGame(42)

    expect(await screen.findByText('White: Alex')).toBeInTheDocument()
    expect(getOnlineGame).toHaveBeenCalledWith(42)
    expect(pieceOn('e2')).toBe('wP')
    expect(pieceOn('e7')).toBe('bP')
  })

  it("shows both participants and the viewer's color", async () => {
    vi.mocked(getOnlineGame).mockResolvedValue(pendingGame)

    renderGame()

    expect(await screen.findByText('White: Alex')).toBeInTheDocument()
    expect(screen.getByText('Black: Sam')).toBeInTheDocument()
    expect(screen.getByText('You play Black')).toBeInTheDocument()
  })

  it('shows a rated game with the default 30+10 clock', async () => {
    vi.mocked(getOnlineGame).mockResolvedValue(pendingGame)

    renderGame()

    expect(await screen.findByText('Rated game')).toBeInTheDocument()
    expect(screen.getByText('30 min + 10 s')).toBeInTheDocument()
  })

  it('shows an unrated game without a clock', async () => {
    vi.mocked(getOnlineGame).mockResolvedValue({ ...pendingGame, rated: false, clock: { enabled: false } })

    renderGame()

    expect(await screen.findByText('Unrated game')).toBeInTheDocument()
    expect(screen.getByText('No clock')).toBeInTheDocument()
  })

  it('says the game has not started while it is pending', async () => {
    vi.mocked(getOnlineGame).mockResolvedValue(pendingGame)

    renderGame()

    expect(await screen.findByText('Waiting for both players to get ready.')).toBeInTheDocument()
  })

  it('explains when the game does not exist or the viewer is not a participant', async () => {
    vi.mocked(getOnlineGame).mockRejectedValue(new ApiError(404, 'ONLINE_GAME_NOT_FOUND'))

    renderGame()

    expect(await screen.findByRole('alert')).toHaveTextContent('This game was not found.')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('offers a retry after an unexpected failure', async () => {
    vi.mocked(getOnlineGame).mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR')).mockResolvedValueOnce(pendingGame)
    const { user } = renderGame()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('White: Alex')).toBeInTheDocument()
  })
})
