import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/errors'
import { renderWithClient } from '../../../test/utils'
import { getMatchHistory, type MatchHistoryEntry, type MatchHistoryPage } from '../api'
import { MatchHistory } from './MatchHistory'

vi.mock('../api', () => ({ getMatchHistory: vi.fn(), getHistoryGame: vi.fn(), MATCH_HISTORY_PAGE_SIZE: 20 }))

/** A rated invite the viewer (White) won because Sam did not reconnect in time. */
const ratedForfeitWin: MatchHistoryEntry = {
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
  terminationReason: 'DISCONNECT',
  startedAt: '2026-10-31T10:06:00Z',
  endedAt: '2026-10-31T10:40:00Z',
  plyCount: 24,
  ratingChange: { ratingBefore: 800, ratingDelta: 12, ratingAfter: 812, kFactor: 20 },
}

/** An unrated invite without a clock that the viewer (Black) forfeited by staying disconnected. */
const unratedForfeitLoss: MatchHistoryEntry = {
  gameId: 41,
  source: 'INVITE',
  rated: false,
  mode: 'CLASSICAL',
  variant: 'STANDARD',
  clock: { enabled: false },
  viewerColor: 'BLACK',
  opponent: { accountId: 9, displayName: 'Jo' },
  result: 'LOSS',
  outcome: 'WHITE_WIN',
  terminationReason: 'DISCONNECT',
  startedAt: '2026-10-30T09:00:00Z',
  endedAt: '2026-10-30T09:30:00Z',
  plyCount: 10,
}

/** A rated game both players agreed to abandon. */
const ratedAbandonDraw: MatchHistoryEntry = {
  gameId: 40,
  source: 'MATCHMAKING',
  rated: true,
  mode: 'CLASSICAL',
  variant: 'STANDARD',
  clock: { enabled: true, initialMinutes: 15, incrementSeconds: 5 },
  viewerColor: 'WHITE',
  opponent: { accountId: 10, displayName: 'Kim' },
  result: 'DRAW',
  outcome: 'DRAW',
  terminationReason: 'MUTUAL_ABANDONMENT',
  startedAt: '2026-10-29T09:00:00Z',
  endedAt: '2026-10-29T09:05:00Z',
  plyCount: 2,
  ratingChange: { ratingBefore: 812, ratingDelta: 0, ratingAfter: 812, kFactor: 20 },
}

const pageOf = (content: MatchHistoryEntry[], overrides: Partial<MatchHistoryPage> = {}): MatchHistoryPage => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: content.length === 0 ? 0 : 1,
  last: true,
  ...overrides,
})

function renderHistory(page = 0, onPageChange = vi.fn()) {
  renderWithClient(
    <MemoryRouter>
      <MatchHistory page={page} onPageChange={onPageChange} />
    </MemoryRouter>,
  )
  return { onPageChange, user: userEvent.setup() }
}

/** The list entry for the game against the given opponent. */
async function entryAgainst(name: string) {
  const list = await screen.findByRole('list', { name: 'Match history' })
  const item = within(list)
    .getAllByRole('listitem')
    .find((element) => within(element).queryByText(`vs ${name}`))
  if (!item) {
    throw new Error(`No history entry against ${name}`)
  }
  return within(item)
}

afterEach(() => {
  vi.resetAllMocks()
})

describe('match history list', () => {
  it('lists every finished game the server returns, newest first as received', async () => {
    vi.mocked(getMatchHistory).mockResolvedValue(pageOf([ratedForfeitWin, unratedForfeitLoss, ratedAbandonDraw]))
    renderHistory()

    const list = await screen.findByRole('list', { name: 'Match history' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('vs Sam')
    expect(items[1]).toHaveTextContent('vs Jo')
    expect(items[2]).toHaveTextContent('vs Kim')
    expect(getMatchHistory).toHaveBeenCalledWith(0)
  })

  it('shows a forfeit as a win and its reason from the side of the player who stayed', async () => {
    vi.mocked(getMatchHistory).mockResolvedValue(pageOf([ratedForfeitWin]))
    renderHistory()

    const entry = await entryAgainst('Sam')
    expect(entry.getByText('Win')).toBeInTheDocument()
    expect(entry.getByText('Your opponent disconnected and forfeited')).toBeInTheDocument()
  })

  it('shows a forfeit as a loss and its reason from the side of the player who left', async () => {
    vi.mocked(getMatchHistory).mockResolvedValue(pageOf([unratedForfeitLoss]))
    renderHistory()

    const entry = await entryAgainst('Jo')
    expect(entry.getByText('Loss')).toBeInTheDocument()
    expect(entry.getByText('You disconnected and forfeited')).toBeInTheDocument()
  })

  it('shows a mutually abandoned game as a draw', async () => {
    vi.mocked(getMatchHistory).mockResolvedValue(pageOf([ratedAbandonDraw]))
    renderHistory()

    const entry = await entryAgainst('Kim')
    expect(entry.getByText('Draw')).toBeInTheDocument()
    expect(entry.getByText('Abandoned by agreement')).toBeInTheDocument()
  })

  it.each([
    ['CHECKMATE', 'WIN', 'You won by checkmate'],
    ['CHECKMATE', 'LOSS', 'You lost by checkmate'],
    ['RESIGNATION', 'WIN', 'Your opponent resigned'],
    ['RESIGNATION', 'LOSS', 'You resigned'],
    ['TIMEOUT', 'WIN', 'Your opponent ran out of time'],
    ['TIMEOUT', 'LOSS', 'You ran out of time'],
    ['STALEMATE', 'DRAW', 'Stalemate'],
    ['REPETITION', 'DRAW', 'Threefold repetition'],
    ['MOVE_COUNT', 'DRAW', 'Fifty-move rule'],
    ['INSUFFICIENT_MATERIAL', 'DRAW', 'Insufficient material'],
  ])('describes a %s ending with result %s as “%s”', async (terminationReason, result, text) => {
    vi.mocked(getMatchHistory).mockResolvedValue(pageOf([{ ...ratedForfeitWin, terminationReason, result }]))
    renderHistory()

    const entry = await entryAgainst('Sam')
    expect(entry.getByText(text)).toBeInTheDocument()
  })

  it('shows the stored settings of each game', async () => {
    vi.mocked(getMatchHistory).mockResolvedValue(pageOf([ratedForfeitWin, unratedForfeitLoss]))
    renderHistory()

    const rated = await entryAgainst('Sam')
    expect(rated.getByText('Rated game')).toBeInTheDocument()
    expect(rated.getByText('30 min + 10 s')).toBeInTheDocument()
    expect(rated.getByText('Invitation')).toBeInTheDocument()

    const unrated = await entryAgainst('Jo')
    expect(unrated.getByText('Unrated game')).toBeInTheDocument()
    expect(unrated.getByText('No clock')).toBeInTheDocument()
  })

  it('shows the viewer’s rating change for a rated game', async () => {
    vi.mocked(getMatchHistory).mockResolvedValue(pageOf([ratedForfeitWin, ratedAbandonDraw]))
    renderHistory()

    expect((await entryAgainst('Sam')).getByText('Rating 800 → 812 (+12)')).toBeInTheDocument()
    expect((await entryAgainst('Kim')).getByText('Rating 812 → 812 (0)')).toBeInTheDocument()
  })

  it('shows a completed unrated invite without a rating change', async () => {
    vi.mocked(getMatchHistory).mockResolvedValue(pageOf([unratedForfeitLoss]))
    renderHistory()

    const entry = await entryAgainst('Jo')
    expect(entry.getByText('Unrated game')).toBeInTheDocument()
    expect(entry.queryByText(/Rating \d/)).not.toBeInTheDocument()
  })

  it('shows a rating loss with a minus sign', async () => {
    vi.mocked(getMatchHistory).mockResolvedValue(
      pageOf([
        {
          ...ratedForfeitWin,
          result: 'LOSS',
          ratingChange: { ratingBefore: 800, ratingDelta: -12, ratingAfter: 788, kFactor: 20 },
        },
      ]),
    )
    renderHistory()

    expect((await entryAgainst('Sam')).getByText('Rating 800 → 788 (-12)')).toBeInTheDocument()
  })

  it('links each game to its detail page', async () => {
    vi.mocked(getMatchHistory).mockResolvedValue(pageOf([ratedForfeitWin]))
    renderHistory()

    const entry = await entryAgainst('Sam')
    expect(entry.getByRole('link', { name: 'View game against Sam' })).toHaveAttribute('href', '/history/42')
  })

  it('says so when the player has no finished games', async () => {
    vi.mocked(getMatchHistory).mockResolvedValue(pageOf([]))
    renderHistory()

    expect(await screen.findByText('You have no finished online games yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Match history' })).not.toBeInTheDocument()
  })

  it('shows a generic error with a retry when the history cannot be loaded', async () => {
    vi.mocked(getMatchHistory)
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'stack trace'))
      .mockResolvedValue(pageOf([ratedForfeitWin]))
    const { user } = renderHistory()

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument()
    expect(screen.queryByText('stack trace')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await entryAgainst('Sam')).toBeTruthy()
  })
})

describe('match history pages', () => {
  it('hides paging when everything fits on one page', async () => {
    vi.mocked(getMatchHistory).mockResolvedValue(pageOf([ratedForfeitWin]))
    renderHistory()

    await entryAgainst('Sam')
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('offers the next page from the first one', async () => {
    vi.mocked(getMatchHistory).mockResolvedValue(
      pageOf([ratedForfeitWin], { page: 0, totalElements: 21, totalPages: 2, last: false }),
    )
    const { onPageChange, user } = renderHistory(0)

    await entryAgainst('Sam')
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Next page' }))

    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('loads the requested page and offers the previous one from the last', async () => {
    vi.mocked(getMatchHistory).mockResolvedValue(
      pageOf([unratedForfeitLoss], { page: 1, totalElements: 21, totalPages: 2, last: true }),
    )
    const { onPageChange, user } = renderHistory(1)

    await entryAgainst('Jo')
    expect(getMatchHistory).toHaveBeenCalledWith(1)
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Previous page' }))

    expect(onPageChange).toHaveBeenCalledWith(0)
  })
})
