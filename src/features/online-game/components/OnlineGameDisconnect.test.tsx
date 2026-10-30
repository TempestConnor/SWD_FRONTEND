import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/errors'
import { clickMove } from '../../../test/board'
import { renderWithClient } from '../../../test/utils'
import {
  getMoves,
  getOnlineGame,
  heartbeatOnlineGame,
  makeMove,
  resignOnlineGame,
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
  resignOnlineGame: vi.fn(),
  voteToAbandon: vi.fn(),
}))

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
const afterE4E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
const startedAt = '2026-10-31T10:06:00Z'
/** Sam's last contact; the server forfeits Sam three minutes later, at 10:10:00. */
const opponentLastSeen = '2026-10-31T10:07:00Z'
const forfeitAt = Date.parse('2026-10-31T10:10:00Z')

/** White (Alex) is the viewer and is to move. */
const activeGame: OnlineGameData = {
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

const opponentAway: OnlineGameData = {
  ...activeGame,
  black: { ...activeGame.black, disconnectedAt: opponentLastSeen },
}

/** Sam stayed away past the grace: White wins by DISCONNECT, recorded at last contact + 3 minutes. */
const opponentForfeited: OnlineGameData = {
  ...opponentAway,
  status: 'COMPLETED',
  outcome: 'WHITE_WIN',
  terminationReason: 'DISCONNECT',
  endedAt: '2026-10-31T10:10:00Z',
}

/** The viewer (White) stayed away past the grace. */
const viewerForfeited: OnlineGameData = {
  ...activeGame,
  white: { ...activeGame.white, disconnectedAt: opponentLastSeen },
  status: 'COMPLETED',
  outcome: 'BLACK_WIN',
  terminationReason: 'DISCONNECT',
  endedAt: '2026-10-31T10:10:00Z',
}

const unratedNoClock = (game: OnlineGameData): OnlineGameData => ({
  ...game,
  rated: false,
  clock: { enabled: false },
  whiteRemainingMs: undefined,
  blackRemainingMs: undefined,
})

const opponentNotice = () => screen.queryByText(/Sam has lost connection/)
const connectionWarning = () => screen.queryByText(/Connection to the server lost/)

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
  vi.setSystemTime(new Date('2026-10-31T10:08:30Z'))
  vi.mocked(getMoves).mockResolvedValue([])
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

describe('an opponent who disconnects', () => {
  it('shows that the opponent lost connection and counts down their three-minute grace from the server’s time', async () => {
    await renderLoaded(opponentAway)

    expect(
      screen.getByText('Sam has lost connection. If they do not return, they forfeit in 1:30.'),
    ).toBeInTheDocument()

    await advance(10_000)

    expect(
      screen.getByText('Sam has lost connection. If they do not return, they forfeit in 1:20.'),
    ).toBeInTheDocument()
  })

  it('hides the notice when the opponent reconnects in time and the game goes on', async () => {
    await renderLoaded(opponentAway)
    expect(opponentNotice()).toBeInTheDocument()

    vi.mocked(heartbeatOnlineGame).mockResolvedValue(activeGame)
    await advance(10_000)

    expect(opponentNotice()).not.toBeInTheDocument()
    expect(screen.getByText('Your move')).toBeInTheDocument()
    expect(screen.queryByText(/You win|You lose/)).not.toBeInTheDocument()
  })

  it('never counts below zero while waiting for the server to record the forfeit', async () => {
    vi.setSystemTime(new Date(forfeitAt + 20_000))
    await renderLoaded(opponentAway)

    expect(
      screen.getByText('Sam has lost connection. If they do not return, they forfeit in 0:00.'),
    ).toBeInTheDocument()
  })

  it('asks the server for the result as soon as the opponent’s grace runs out', async () => {
    vi.setSystemTime(new Date(forfeitAt - 2_500))
    await renderLoaded(opponentAway)
    expect(heartbeatOnlineGame).toHaveBeenCalledTimes(1)
    vi.mocked(heartbeatOnlineGame).mockResolvedValue(opponentForfeited)

    await advance(3_000)

    expect(screen.getByText('Your opponent did not reconnect in time. You win.')).toBeInTheDocument()
    expect(opponentNotice()).not.toBeInTheDocument()
  })

  it('shows the forfeit when a resignation reaches a game whose forfeit was already due', async () => {
    vi.setSystemTime(new Date(forfeitAt + 1_000))
    const { user } = await renderLoaded(opponentAway)
    vi.mocked(resignOnlineGame).mockResolvedValue(opponentForfeited)

    await user.click(screen.getByRole('button', { name: 'Resign' }))
    await advance(0)

    expect(screen.getByText('Your opponent did not reconnect in time. You win.')).toBeInTheDocument()
  })
})

describe('disconnect forfeits', () => {
  it('shows the loss to the player who stayed away', async () => {
    await renderLoaded(viewerForfeited)

    expect(screen.getByText('You were disconnected for too long. You lose.')).toBeInTheDocument()
  })

  it('shows no countdown once the game has ended', async () => {
    await renderLoaded(opponentForfeited)

    expect(screen.getByText('Your opponent did not reconnect in time. You win.')).toBeInTheDocument()
    expect(opponentNotice()).not.toBeInTheDocument()
  })

  it('also forfeits an unrated invite game without a clock', async () => {
    await renderLoaded(unratedNoClock(opponentForfeited))

    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.getByText('Your opponent did not reconnect in time. You win.')).toBeInTheDocument()
  })

  it('counts down the opponent’s grace in a game without a clock', async () => {
    await renderLoaded(unratedNoClock(opponentAway))

    expect(
      screen.getByText('Sam has lost connection. If they do not return, they forfeit in 1:30.'),
    ).toBeInTheDocument()
  })

  it('shows the forfeit promptly when the server refuses a move because it is already due', async () => {
    const { user } = await renderLoaded(activeGame)
    vi.mocked(makeMove).mockRejectedValue(new ApiError(409, 'DISCONNECT_FORFEIT_DUE'))
    vi.mocked(heartbeatOnlineGame).mockResolvedValue(viewerForfeited)

    await clickMove(user, 'e2e4')
    await advance(1_000)

    expect(screen.getByText('You were disconnected for too long. You lose.')).toBeInTheDocument()
  })
})

describe('the viewer’s own connection', () => {
  it('warns the viewer when the server cannot be reached, and keeps the game on screen', async () => {
    await renderLoaded(activeGame)
    expect(connectionWarning()).not.toBeInTheDocument()

    vi.mocked(heartbeatOnlineGame).mockRejectedValue(new TypeError('Failed to fetch'))
    await advance(10_000)

    expect(
      screen.getByText(
        'Connection to the server lost. Reconnecting… If you stay away for three minutes, you forfeit the game.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Your move')).toBeInTheDocument()
  })

  it('keeps trying and restores the latest game once a heartbeat gets through again', async () => {
    await renderLoaded({ ...activeGame, currentFen: afterE4, lastPly: 1 })
    expect(screen.getByText('Waiting for your opponent’s move')).toBeInTheDocument()

    vi.mocked(heartbeatOnlineGame).mockRejectedValue(new TypeError('Failed to fetch'))
    await advance(10_000)
    expect(connectionWarning()).toBeInTheDocument()

    vi.mocked(heartbeatOnlineGame).mockResolvedValue({ ...activeGame, currentFen: afterE4E5, lastPly: 2 })
    await advance(10_000)

    expect(connectionWarning()).not.toBeInTheDocument()
    expect(screen.getByText('Your move')).toBeInTheDocument()
  })

  it('drops the warning once the game has ended', async () => {
    const { user } = await renderLoaded(activeGame)
    vi.mocked(heartbeatOnlineGame).mockRejectedValue(new TypeError('Failed to fetch'))
    await advance(10_000)
    expect(connectionWarning()).toBeInTheDocument()

    vi.mocked(resignOnlineGame).mockResolvedValue({
      ...activeGame,
      status: 'COMPLETED',
      outcome: 'BLACK_WIN',
      terminationReason: 'RESIGNATION',
    })
    await user.click(screen.getByRole('button', { name: 'Resign' }))
    await advance(0)

    expect(screen.getByText('You resigned. You lose.')).toBeInTheDocument()
    expect(connectionWarning()).not.toBeInTheDocument()
  })
})
