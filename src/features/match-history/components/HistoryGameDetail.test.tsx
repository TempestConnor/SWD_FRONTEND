import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/errors'
import { renderWithClient } from '../../../test/utils'
import { getHistoryGame, type HistoryGame } from '../api'
import { HistoryGameDetail } from './HistoryGameDetail'

vi.mock('../api', () => ({ getMatchHistory: vi.fn(), getHistoryGame: vi.fn(), MATCH_HISTORY_PAGE_SIZE: 20 }))

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const finalFen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2'

/** A rated game the viewer (Black) resigned after three plies. */
const ratedResignation: HistoryGame = {
  gameId: 42,
  source: 'INVITE',
  rated: true,
  mode: 'CLASSICAL',
  variant: 'STANDARD',
  clock: { enabled: true, initialMinutes: 30, incrementSeconds: 10 },
  viewerColor: 'BLACK',
  result: 'LOSS',
  white: { accountId: 7, displayName: 'Alex' },
  black: { accountId: 8, displayName: 'Sam' },
  whiteRatingChange: { ratingBefore: 790, ratingDelta: 12, ratingAfter: 802, kFactor: 20 },
  blackRatingChange: { ratingBefore: 810, ratingDelta: -12, ratingAfter: 798, kFactor: 20 },
  outcome: 'WHITE_WIN',
  terminationReason: 'RESIGNATION',
  startedAt: '2026-10-31T10:06:00Z',
  endedAt: '2026-10-31T10:20:00Z',
  initialFen: startFen,
  finalFen,
  plyCount: 3,
  moves: [
    { ply: 1, move: 'e2e4', san: 'e4' },
    { ply: 2, move: 'e7e5', san: 'e5' },
    { ply: 3, move: 'g1f3', san: 'Nf3', fen: finalFen },
  ],
}

/** The same game as an unrated invite without a clock, which the viewer won when the opponent forfeited. */
const unratedForfeit: HistoryGame = {
  ...ratedResignation,
  rated: false,
  clock: { enabled: false },
  result: 'WIN',
  outcome: 'BLACK_WIN',
  terminationReason: 'DISCONNECT',
  whiteRatingChange: undefined,
  blackRatingChange: undefined,
}

function renderDetail(gameId = 42) {
  renderWithClient(
    <MemoryRouter>
      <HistoryGameDetail gameId={gameId} />
    </MemoryRouter>,
  )
  return { user: userEvent.setup() }
}

afterEach(() => {
  vi.resetAllMocks()
})

describe('history game detail', () => {
  it('shows both players by their current names and which side the viewer played', async () => {
    vi.mocked(getHistoryGame).mockResolvedValue(ratedResignation)
    renderDetail()

    expect(await screen.findByText('White: Alex')).toBeInTheDocument()
    expect(screen.getByText('Black: Sam')).toBeInTheDocument()
    expect(screen.getByText('You played Black')).toBeInTheDocument()
    expect(getHistoryGame).toHaveBeenCalledWith(42)
  })

  it('shows the result and its reason from the viewer’s side', async () => {
    vi.mocked(getHistoryGame).mockResolvedValue(ratedResignation)
    renderDetail()

    expect(await screen.findByText('Loss')).toBeInTheDocument()
    expect(screen.getByText('You resigned')).toBeInTheDocument()
  })

  it('shows a disconnect forfeit as a win for the player who stayed', async () => {
    vi.mocked(getHistoryGame).mockResolvedValue(unratedForfeit)
    renderDetail()

    expect(await screen.findByText('Win')).toBeInTheDocument()
    expect(screen.getByText('Your opponent disconnected and forfeited')).toBeInTheDocument()
  })

  it('shows the stored settings of the game', async () => {
    vi.mocked(getHistoryGame).mockResolvedValue(ratedResignation)
    renderDetail()

    expect(await screen.findByText('Rated game')).toBeInTheDocument()
    expect(screen.getByText('30 min + 10 s')).toBeInTheDocument()
    expect(screen.getByText('Invitation')).toBeInTheDocument()
  })

  it('shows both players’ rating changes for a rated game', async () => {
    vi.mocked(getHistoryGame).mockResolvedValue(ratedResignation)
    renderDetail()

    expect(await screen.findByText('Alex: rating 790 → 802 (+12)')).toBeInTheDocument()
    expect(screen.getByText('Sam: rating 810 → 798 (-12)')).toBeInTheDocument()
  })

  it('shows an unrated game without rating changes', async () => {
    vi.mocked(getHistoryGame).mockResolvedValue(unratedForfeit)
    renderDetail()

    expect(await screen.findByText('Unrated game')).toBeInTheDocument()
    expect(screen.getByText('No clock')).toBeInTheDocument()
    expect(screen.queryByText(/rating \d/)).not.toBeInTheDocument()
  })

  it('lists the moves in ply order', async () => {
    vi.mocked(getHistoryGame).mockResolvedValue(ratedResignation)
    renderDetail()

    const moves = await screen.findByRole('list', { name: 'Moves' })
    expect(within(moves).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['e4', 'e5', 'Nf3'])
  })

  it('links back to the match history', async () => {
    vi.mocked(getHistoryGame).mockResolvedValue(ratedResignation)
    renderDetail()

    expect(await screen.findByRole('link', { name: 'Back to match history' })).toHaveAttribute('href', '/history')
  })

  it('sends a player to the live game when that game has not finished yet', async () => {
    vi.mocked(getHistoryGame).mockRejectedValue(new ApiError(404, 'GAME_NOT_IN_HISTORY'))
    renderDetail()

    expect(
      await screen.findByText('This game has not finished yet, so it is not in your history.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the game' })).toHaveAttribute('href', '/games/42')
  })

  it('says the game was not found when the player did not take part in it', async () => {
    vi.mocked(getHistoryGame).mockRejectedValue(new ApiError(404, 'ONLINE_GAME_NOT_FOUND'))
    renderDetail()

    expect(await screen.findByText('This game was not found.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Go to the game' })).not.toBeInTheDocument()
  })

  it('shows a generic error with a retry for any other failure', async () => {
    vi.mocked(getHistoryGame)
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'stack trace'))
      .mockResolvedValue(ratedResignation)
    const { user } = renderDetail()

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument()
    expect(screen.queryByText('stack trace')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('White: Alex')).toBeInTheDocument()
  })
})

describe('captured pieces', () => {
  it('shows the pieces each side captured and the final material lead', async () => {
    const afterQxa2 = 'rnb1kbnr/ppp1pppp/8/8/8/2N5/qPPP1PPP/R1BQKBNR w KQkq - 0 4'
    vi.mocked(getHistoryGame).mockResolvedValue({
      ...ratedResignation,
      finalFen: afterQxa2,
      plyCount: 6,
      moves: [
        { ply: 1, move: 'e2e4', san: 'e4' },
        { ply: 2, move: 'd7d5', san: 'd5' },
        { ply: 3, move: 'e4d5', san: 'exd5' },
        { ply: 4, move: 'd8d5', san: 'Qxd5' },
        { ply: 5, move: 'b1c3', san: 'Nc3' },
        { ply: 6, move: 'd5a2', san: 'Qxa2', fen: afterQxa2 },
      ],
    })
    renderDetail()

    const black = await screen.findByRole('group', { name: 'Captured by Black' })
    expect(within(black).getAllByText('Pawn')).toHaveLength(2)
    expect(within(black).getByText('+1')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Captured by White' })).getAllByText('Pawn')).toHaveLength(1)
  })
})
