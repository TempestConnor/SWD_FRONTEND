import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/errors'
import { clickMove } from '../../../test/board'
import { deferred } from '../../../test/deferred'
import { renderWithClient } from '../../../test/utils'
import {
  getMoves,
  getOnlineGame,
  heartbeatOnlineGame,
  makeMove,
  type OnlineGame as OnlineGameData,
} from '../api'
import { OnlineGame } from './OnlineGame'

vi.mock('../api', () => ({
  getOnlineGame: vi.fn(),
  markReady: vi.fn(),
  cancelOnlineGame: vi.fn(),
  heartbeatOnlineGame: vi.fn(),
  makeMove: vi.fn(),
  getMoves: vi.fn(),
}))

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
const startedAt = '2026-10-31T10:06:00Z'
const start = Date.parse(startedAt)

/** White (Alex) is the viewer and is to move at the start. */
const activeGame: OnlineGameData = {
  id: 42,
  source: 'INVITE',
  status: 'ACTIVE',
  rated: true,
  mode: 'CLASSICAL',
  variant: 'STANDARD',
  clock: { enabled: true, initialMinutes: 30, incrementSeconds: 10 },
  white: { accountId: 7, displayName: 'Alex', ready: true },
  black: { accountId: 8, displayName: 'Sam', ready: true },
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

const asBlack = (game: OnlineGameData): OnlineGameData => ({ ...game, viewerColor: 'BLACK' })

/** White's flag fell at `endedAt`; the server stops White's clock at zero. */
const whiteTimedOut: OnlineGameData = {
  ...activeGame,
  status: 'COMPLETED',
  outcome: 'BLACK_WIN',
  terminationReason: 'TIMEOUT',
  endedAt: '2026-10-31T10:06:02.500Z',
  whiteRemainingMs: 0,
  blackRemainingMs: 1_234_000,
}

const noClockGame: OnlineGameData = {
  ...activeGame,
  rated: false,
  clock: { enabled: false },
  whiteRemainingMs: undefined,
  blackRemainingMs: undefined,
}

const whiteClock = () => screen.getByRole('timer', { name: 'White clock' })
const blackClock = () => screen.getByRole('timer', { name: 'Black clock' })

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

async function renderLoaded(game: OnlineGameData) {
  vi.mocked(getOnlineGame).mockResolvedValue(game)
  vi.mocked(heartbeatOnlineGame).mockResolvedValue(game)
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const rendered = renderWithClient(<OnlineGame gameId={42} />)
  await advance(0)
  expect(screen.getByText(`White: ${game.white?.displayName}`)).toBeInTheDocument()
  return { user, ...rendered }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(start))
  vi.mocked(getMoves).mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
  vi.resetAllMocks()
})

describe('server-authoritative clocks', () => {
  it('shows both players’ remaining time from the server', async () => {
    await renderLoaded({ ...activeGame, whiteRemainingMs: 1_000_000, blackRemainingMs: 1_200_000 })

    expect(whiteClock()).toHaveTextContent('16:40')
    expect(blackClock()).toHaveTextContent('20:00')
  })

  it('counts down the side to move from the server’s turn start, not from when the page loaded', async () => {
    vi.setSystemTime(new Date(start + 65_000))
    await renderLoaded(activeGame)

    expect(whiteClock()).toHaveTextContent('28:55')
    expect(blackClock()).toHaveTextContent('30:00')

    await advance(5_000)

    expect(whiteClock()).toHaveTextContent('28:50')
    expect(blackClock()).toHaveTextContent('30:00')
  })

  it('runs the opponent’s clock on their turn', async () => {
    await renderLoaded({ ...activeGame, currentFen: afterE4, lastPly: 1 })

    await advance(30_000)

    expect(whiteClock()).toHaveTextContent('30:00')
    expect(blackClock()).toHaveTextContent('29:30')
  })

  it('takes the times the server returns after the viewer’s move, increment included', async () => {
    const { user } = await renderLoaded(activeGame)
    await advance(15_000)
    vi.mocked(makeMove).mockResolvedValue({
      ...activeGame,
      currentFen: afterE4,
      lastPly: 1,
      whiteRemainingMs: 1_795_000,
      turnStartedAt: new Date(start + 15_000).toISOString(),
    })

    await clickMove(user, 'e2e4')
    await advance(0)

    expect(whiteClock()).toHaveTextContent('29:55')
    expect(blackClock()).toHaveTextContent('30:00')

    await advance(3_000)

    expect(whiteClock()).toHaveTextContent('29:55')
    expect(blackClock()).toHaveTextContent('29:57')
  })

  it('does not run the clocks before the game starts', async () => {
    await renderLoaded({
      ...activeGame,
      status: 'PENDING',
      startedAt: undefined,
      turnStartedAt: undefined,
      white: { accountId: 7, displayName: 'Alex', ready: false },
      black: { accountId: 8, displayName: 'Sam', ready: false },
    })

    await advance(10_000)

    expect(whiteClock()).toHaveTextContent('30:00')
    expect(blackClock()).toHaveTextContent('30:00')
  })
})

describe('timeouts', () => {
  it('leaves the result to the server when the shown time reaches zero', async () => {
    await renderLoaded({ ...activeGame, whiteRemainingMs: 2_500 })

    await advance(3_000)

    expect(whiteClock()).toHaveTextContent('0:00')
    expect(screen.queryByText(/ran out of time/)).not.toBeInTheDocument()
  })

  it('asks the server for the result as soon as a clock reaches zero', async () => {
    await renderLoaded({ ...activeGame, whiteRemainingMs: 2_500 })
    vi.mocked(heartbeatOnlineGame).mockResolvedValue(whiteTimedOut)

    await advance(3_000)

    expect(screen.getByText('You ran out of time. You lose.')).toBeInTheDocument()
  })

  it('asks only once when the server still has time left on that clock', async () => {
    await renderLoaded({ ...activeGame, whiteRemainingMs: 2_500 })

    await advance(4_500)

    expect(heartbeatOnlineGame).toHaveBeenCalledTimes(2)
  })

  it('shows the win when the opponent runs out of time', async () => {
    await renderLoaded(asBlack({ ...activeGame, whiteRemainingMs: 60_000 }))
    vi.mocked(heartbeatOnlineGame).mockResolvedValue(asBlack(whiteTimedOut))

    await advance(6_000)

    expect(screen.getByText('Your opponent ran out of time. You win.')).toBeInTheDocument()
    expect(screen.queryByText('Your move')).not.toBeInTheDocument()
    expect(screen.queryByText('Waiting for your opponent’s move')).not.toBeInTheDocument()
  })

  it('shows a finished game’s clocks stopped at the server’s final times', async () => {
    await renderLoaded(whiteTimedOut)

    expect(screen.getByText('You ran out of time. You lose.')).toBeInTheDocument()
    expect(whiteClock()).toHaveTextContent('0:00')
    expect(blackClock()).toHaveTextContent('20:34')

    await advance(10_000)

    expect(blackClock()).toHaveTextContent('20:34')
  })

  it('shows the timeout result promptly when the server refuses a move because the time ran out', async () => {
    const { user } = await renderLoaded(activeGame)
    vi.mocked(makeMove).mockRejectedValue(new ApiError(409, 'TIME_EXPIRED'))
    vi.mocked(heartbeatOnlineGame).mockResolvedValue(whiteTimedOut)

    await clickMove(user, 'e2e4')
    await advance(1_000)

    expect(screen.getByText('You ran out of time. You lose.')).toBeInTheDocument()
  })

  it('keeps a finished game finished when an older read still shows it active', async () => {
    const { user } = await renderLoaded(activeGame)
    const staleRead = deferred<OnlineGameData>()
    vi.mocked(getOnlineGame).mockReturnValue(staleRead.promise)
    vi.mocked(makeMove).mockRejectedValue(new ApiError(409, 'TIME_EXPIRED'))
    vi.mocked(heartbeatOnlineGame).mockResolvedValue(whiteTimedOut)

    await clickMove(user, 'e2e4')
    await advance(1_000)
    expect(screen.getByText('You ran out of time. You lose.')).toBeInTheDocument()

    await act(async () => staleRead.resolve(activeGame))

    expect(screen.getByText('You ran out of time. You lose.')).toBeInTheDocument()
    expect(whiteClock()).toHaveTextContent('0:00')
  })
})

describe('games without a clock', () => {
  it('shows no clocks and never times out', async () => {
    await renderLoaded(noClockGame)

    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.getByText('No clock')).toBeInTheDocument()

    await advance(60 * 60_000)

    expect(screen.getByText('Your move')).toBeInTheDocument()
    expect(screen.queryByText(/ran out of time/)).not.toBeInTheDocument()
  })
})
