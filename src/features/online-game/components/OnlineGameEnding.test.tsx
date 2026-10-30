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
  resignOnlineGame,
  voteToAbandon,
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
const startedAt = '2026-10-31T10:06:00Z'

/** White (Alex) is the viewer and is to move at the start. */
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

const completed = (outcome: string, terminationReason: string): OnlineGameData => ({
  ...activeGame,
  status: 'COMPLETED',
  outcome,
  terminationReason,
  endedAt: '2026-10-31T10:20:00Z',
})
const whiteResigned = completed('BLACK_WIN', 'RESIGNATION')
const blackResigned = completed('WHITE_WIN', 'RESIGNATION')
const abandoned: OnlineGameData = {
  ...completed('DRAW', 'MUTUAL_ABANDONMENT'),
  white: { ...activeGame.white, abandonVoted: true },
  black: { ...activeGame.black, abandonVoted: true },
}
const viewerVoted: OnlineGameData = { ...activeGame, white: { ...activeGame.white, abandonVoted: true } }
const opponentVoted: OnlineGameData = { ...activeGame, black: { ...activeGame.black, abandonVoted: true } }

const resignButton = () => screen.queryByRole('button', { name: 'Resign' })
const proposeButton = () => screen.queryByRole('button', { name: 'Propose abandoning' })
const agreeButton = () => screen.queryByRole('button', { name: 'Agree to abandon' })

function renderGame(user = userEvent.setup()) {
  return { user, ...renderWithClient(<OnlineGame gameId={42} />) }
}

async function renderLoaded(game: OnlineGameData, user?: ReturnType<typeof userEvent.setup>) {
  vi.mocked(getOnlineGame).mockResolvedValue(game)
  vi.mocked(heartbeatOnlineGame).mockResolvedValue(game)
  const rendered = renderGame(user)
  await screen.findByText(`White: ${game.white?.displayName}`)
  return rendered
}

beforeEach(() => {
  vi.mocked(getMoves).mockResolvedValue([])
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

describe('resigning an online game', () => {
  it('offers resignation in an active game', async () => {
    await renderLoaded(activeGame)

    expect(resignButton()).toBeEnabled()
  })

  it('resigns after the player confirms and shows the loss', async () => {
    vi.mocked(resignOnlineGame).mockResolvedValue(whiteResigned)
    const { user } = await renderLoaded(activeGame)

    await user.click(resignButton()!)

    expect(window.confirm).toHaveBeenCalled()
    expect(resignOnlineGame).toHaveBeenCalledWith(42)
    expect(await screen.findByText('You resigned. You lose.')).toBeInTheDocument()
  })

  it('does not resign when the player declines the confirmation', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    const { user } = await renderLoaded(activeGame)

    await user.click(resignButton()!)

    expect(window.confirm).toHaveBeenCalled()
    expect(resignOnlineGame).not.toHaveBeenCalled()
    expect(resignButton()).toBeEnabled()
    expect(screen.getByText('Your move')).toBeInTheDocument()
  })

  it('lets the player resign on the opponent’s turn', async () => {
    const blackToMove: OnlineGameData = { ...activeGame, currentFen: afterE4, lastPly: 1 }
    vi.mocked(resignOnlineGame).mockResolvedValue({ ...whiteResigned, currentFen: afterE4, lastPly: 1 })
    const { user } = await renderLoaded(blackToMove)

    expect(screen.getByText('Waiting for your opponent’s move')).toBeInTheDocument()
    await user.click(resignButton()!)

    expect(await screen.findByText('You resigned. You lose.')).toBeInTheDocument()
  })

  it('shows a win when the opponent resigned', async () => {
    await renderLoaded(blackResigned)

    expect(screen.getByText('Your opponent resigned. You win.')).toBeInTheDocument()
  })

  it('shows Black’s win from Black’s side after White resigns', async () => {
    await renderLoaded({ ...whiteResigned, viewerColor: 'BLACK' })

    expect(screen.getByText('Your opponent resigned. You win.')).toBeInTheDocument()
  })

  it('sends one resignation while the first is in flight', async () => {
    const reply = deferred<OnlineGameData>()
    vi.mocked(resignOnlineGame).mockReturnValue(reply.promise)
    const { user } = await renderLoaded(activeGame)

    await user.click(resignButton()!)

    expect(resignButton()).toBeDisabled()
    expect(proposeButton()).toBeDisabled()
    expect(resignOnlineGame).toHaveBeenCalledTimes(1)
    await act(async () => reply.resolve(whiteResigned))
  })

  it('shows the timeout when the flag had already fallen before the resignation', async () => {
    vi.mocked(resignOnlineGame).mockResolvedValue({ ...completed('BLACK_WIN', 'TIMEOUT'), whiteRemainingMs: 0 })
    const { user } = await renderLoaded(activeGame)

    await user.click(resignButton()!)

    expect(await screen.findByText('You ran out of time. You lose.')).toBeInTheDocument()
  })

  it('explains a late resignation and shows the ending the server recorded', async () => {
    vi.mocked(resignOnlineGame).mockRejectedValue(new ApiError(409, 'ONLINE_GAME_NOT_ACTIVE'))
    const { user } = await renderLoaded(activeGame)
    vi.mocked(getOnlineGame).mockResolvedValue(blackResigned)

    await user.click(resignButton()!)

    expect(await screen.findByRole('alert')).toHaveTextContent('This game is no longer in progress.')
    expect(await screen.findByText('Your opponent resigned. You win.')).toBeInTheDocument()
  })

  it('shows the generic error when the resignation fails for another reason', async () => {
    vi.mocked(resignOnlineGame).mockRejectedValue(new Error('network down'))
    const { user } = await renderLoaded(activeGame)

    await user.click(resignButton()!)

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
  })
})

describe('mutually abandoning an online game', () => {
  it('proposes abandoning after the player confirms and keeps the game playable', async () => {
    vi.mocked(voteToAbandon).mockResolvedValue(viewerVoted)
    vi.mocked(makeMove).mockResolvedValue({ ...viewerVoted, currentFen: afterE4, lastPly: 1 })
    const { user } = await renderLoaded(activeGame)

    await user.click(proposeButton()!)

    expect(window.confirm).toHaveBeenCalled()
    expect(voteToAbandon).toHaveBeenCalledWith(42)
    expect(
      await screen.findByText('You proposed abandoning the game. Waiting for your opponent to agree.'),
    ).toBeInTheDocument()
    expect(proposeButton()).not.toBeInTheDocument()
    expect(resignButton()).toBeEnabled()
    expect(screen.getByText('Your move')).toBeInTheDocument()

    await clickMove(user, 'e2e4')
    expect(makeMove).toHaveBeenCalledWith(42, { ply: 1, move: 'e2e4' })
  })

  it('does not vote when the player declines the confirmation', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    const { user } = await renderLoaded(activeGame)

    await user.click(proposeButton()!)

    expect(window.confirm).toHaveBeenCalled()
    expect(voteToAbandon).not.toHaveBeenCalled()
    expect(proposeButton()).toBeEnabled()
  })

  it('keeps showing the viewer’s own proposal after a refresh', async () => {
    await renderLoaded(viewerVoted)

    expect(
      screen.getByText('You proposed abandoning the game. Waiting for your opponent to agree.'),
    ).toBeInTheDocument()
    expect(proposeButton()).not.toBeInTheDocument()
  })

  it('shows the opponent’s proposal and lets the viewer agree', async () => {
    await renderLoaded(opponentVoted)

    expect(screen.getByText('Sam proposes abandoning the game. If you agree, it ends in a draw.')).toBeInTheDocument()
    expect(agreeButton()).toBeEnabled()
    expect(proposeButton()).not.toBeInTheDocument()
  })

  it('ends the game as a draw when the viewer agrees', async () => {
    vi.mocked(voteToAbandon).mockResolvedValue(abandoned)
    const { user } = await renderLoaded(opponentVoted)

    await user.click(agreeButton()!)

    expect(voteToAbandon).toHaveBeenCalledWith(42)
    expect(await screen.findByText('The game was abandoned by agreement. It is a draw.')).toBeInTheDocument()
  })

  it('shows the abandonment draw to both players', async () => {
    await renderLoaded({ ...abandoned, viewerColor: 'BLACK' })

    expect(screen.getByText('The game was abandoned by agreement. It is a draw.')).toBeInTheDocument()
  })

  it('explains a late vote and shows the ending the server recorded', async () => {
    vi.mocked(voteToAbandon).mockRejectedValue(new ApiError(409, 'ONLINE_GAME_NOT_ACTIVE'))
    const { user } = await renderLoaded(activeGame)
    vi.mocked(getOnlineGame).mockResolvedValue(blackResigned)

    await user.click(proposeButton()!)

    expect(await screen.findByRole('alert')).toHaveTextContent('This game is no longer in progress.')
    expect(await screen.findByText('Your opponent resigned. You win.')).toBeInTheDocument()
  })
})

describe('ending controls as the game state changes', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(startedAt))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function advance(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  }

  it('shows the opponent’s proposal learned through the heartbeat', async () => {
    vi.mocked(getOnlineGame).mockResolvedValue(activeGame)
    vi.mocked(heartbeatOnlineGame).mockResolvedValue(activeGame)
    renderGame(userEvent.setup({ advanceTimers: vi.advanceTimersByTime }))
    await advance(0)
    expect(agreeButton()).not.toBeInTheDocument()

    vi.mocked(heartbeatOnlineGame).mockResolvedValue(opponentVoted)
    await advance(10_000)

    expect(screen.getByText('Sam proposes abandoning the game. If you agree, it ends in a draw.')).toBeInTheDocument()
    expect(agreeButton()).toBeInTheDocument()
  })

  it('shows the opponent’s resignation learned through the heartbeat', async () => {
    vi.mocked(getOnlineGame).mockResolvedValue(activeGame)
    vi.mocked(heartbeatOnlineGame).mockResolvedValue(activeGame)
    renderGame(userEvent.setup({ advanceTimers: vi.advanceTimersByTime }))
    await advance(0)

    vi.mocked(heartbeatOnlineGame).mockResolvedValue(blackResigned)
    await advance(10_000)

    expect(screen.getByText('Your opponent resigned. You win.')).toBeInTheDocument()
    expect(resignButton()).not.toBeInTheDocument()
    expect(proposeButton()).not.toBeInTheDocument()
    expect(agreeButton()).not.toBeInTheDocument()
  })

  it('offers resignation and abandonment only once the game has started', async () => {
    const pendingGame: OnlineGameData = { ...activeGame, status: 'PENDING', startedAt: undefined }
    vi.mocked(getOnlineGame).mockResolvedValue(pendingGame)
    vi.mocked(heartbeatOnlineGame).mockResolvedValue(pendingGame)
    renderGame(userEvent.setup({ advanceTimers: vi.advanceTimersByTime }))
    await advance(0)
    expect(screen.getByRole('button', { name: 'Ready' })).toBeInTheDocument()
    expect(resignButton()).not.toBeInTheDocument()
    expect(proposeButton()).not.toBeInTheDocument()

    vi.mocked(heartbeatOnlineGame).mockResolvedValue(activeGame)
    await advance(10_000)

    expect(resignButton()).toBeEnabled()
    expect(proposeButton()).toBeEnabled()
  })
})
