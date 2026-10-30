import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/errors'
import { deferred } from '../../../test/deferred'
import { renderWithClient } from '../../../test/utils'
import {
  cancelOnlineGame,
  getOnlineGame,
  heartbeatOnlineGame,
  markReady,
  type OnlineGame as OnlineGameData,
} from '../api'
import { OnlineGame } from './OnlineGame'

vi.mock('../api', () => ({
  getOnlineGame: vi.fn(),
  markReady: vi.fn(),
  cancelOnlineGame: vi.fn(),
  heartbeatOnlineGame: vi.fn(),
}))

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const claimedAt = '2026-10-31T10:05:00Z'

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
  createdAt: claimedAt,
  readyDeadlineAt: '2026-10-31T10:08:00Z',
  initialFen: startFen,
  currentFen: startFen,
  lastPly: 0,
  whiteRemainingMs: 1_800_000,
  blackRemainingMs: 1_800_000,
}

const viewerReady: OnlineGameData = { ...pendingGame, black: { ...pendingGame.black, ready: true } }
const opponentReady: OnlineGameData = { ...pendingGame, white: { ...pendingGame.white, ready: true } }

const activeGame: OnlineGameData = {
  ...pendingGame,
  status: 'ACTIVE',
  white: { ...pendingGame.white, ready: true },
  black: { ...pendingGame.black, ready: true },
  startedAt: '2026-10-31T10:06:00Z',
  turnStartedAt: '2026-10-31T10:06:00Z',
}

const cancelledGame: OnlineGameData = {
  ...pendingGame,
  status: 'CANCELLED',
  endedAt: '2026-10-31T10:06:00Z',
  terminationReason: 'PRE_START_CANCEL',
}

const cancelledText = /This game was cancelled before it started/

function renderGame(user = userEvent.setup()) {
  return { user, ...renderWithClient(<OnlineGame gameId={42} />) }
}

beforeEach(() => {
  vi.mocked(heartbeatOnlineGame).mockResolvedValue(pendingGame)
})

afterEach(() => {
  vi.resetAllMocks()
})

describe('ready screen of a pending game', () => {
  it('offers Ready and Cancel while the game is pending', async () => {
    vi.mocked(getOnlineGame).mockResolvedValue(pendingGame)

    renderGame()

    expect(await screen.findByRole('button', { name: 'Ready' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Cancel game' })).toBeEnabled()
  })

  it("shows each participant's readiness", async () => {
    vi.mocked(getOnlineGame).mockResolvedValue(opponentReady)

    renderGame()

    expect(await screen.findByText('Alex is ready')).toBeInTheDocument()
    expect(screen.getByText('Sam is not ready yet')).toBeInTheDocument()
  })

  it('records Ready and shows the viewer waiting for the opponent', async () => {
    vi.mocked(getOnlineGame).mockResolvedValue(pendingGame)
    vi.mocked(markReady).mockResolvedValue(viewerReady)
    const { user } = renderGame()

    await user.click(await screen.findByRole('button', { name: 'Ready' }))

    expect(markReady).toHaveBeenCalledWith(42)
    expect(await screen.findByText('Sam is ready')).toBeInTheDocument()
    expect(screen.getByText('You are ready. Waiting for your opponent.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ready' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel game' })).toBeEnabled()
  })

  it('does not send a duplicate Ready while the first is in flight', async () => {
    vi.mocked(getOnlineGame).mockResolvedValue(pendingGame)
    const reply = deferred<OnlineGameData>()
    vi.mocked(markReady).mockReturnValue(reply.promise)
    const { user } = renderGame()

    const ready = await screen.findByRole('button', { name: 'Ready' })
    await user.click(ready)
    await user.click(ready)

    expect(ready).toBeDisabled()
    expect(markReady).toHaveBeenCalledTimes(1)
    await act(async () => reply.resolve(viewerReady))
  })

  it('starts the game when the second Ready arrives in time', async () => {
    vi.mocked(getOnlineGame).mockResolvedValue(opponentReady)
    vi.mocked(markReady).mockResolvedValue(activeGame)
    const { user } = renderGame()

    await user.click(await screen.findByRole('button', { name: 'Ready' }))

    expect(await screen.findByText('The game has started.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ready' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel game' })).not.toBeInTheDocument()
  })

  it('shows the cancellation when Ready reaches a game that was already cancelled', async () => {
    vi.mocked(getOnlineGame).mockResolvedValue(pendingGame)
    vi.mocked(markReady).mockResolvedValue(cancelledGame)
    const { user } = renderGame()

    await user.click(await screen.findByRole('button', { name: 'Ready' }))

    expect(await screen.findByText(cancelledText)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ready' })).not.toBeInTheDocument()
  })

  it('keeps Ready available after an unexpected failure', async () => {
    vi.mocked(getOnlineGame).mockResolvedValue(pendingGame)
    vi.mocked(markReady).mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR'))
    const { user } = renderGame()

    await user.click(await screen.findByRole('button', { name: 'Ready' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(screen.getByRole('button', { name: 'Ready' })).toBeEnabled()
  })
})

describe('cancelling before the start', () => {
  it('cancels immediately and says the game has no result', async () => {
    vi.mocked(getOnlineGame).mockResolvedValue(pendingGame)
    vi.mocked(cancelOnlineGame).mockResolvedValue(cancelledGame)
    const { user } = renderGame()

    await user.click(await screen.findByRole('button', { name: 'Cancel game' }))

    expect(cancelOnlineGame).toHaveBeenCalledWith(42)
    expect(await screen.findByText(cancelledText)).toBeInTheDocument()
    expect(screen.getByText(/no result/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ready' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel game' })).not.toBeInTheDocument()
  })

  it('shows the started game when a cancel loses the race with the second Ready', async () => {
    vi.mocked(getOnlineGame).mockResolvedValueOnce(viewerReady).mockResolvedValue(activeGame)
    vi.mocked(heartbeatOnlineGame).mockResolvedValue(viewerReady)
    vi.mocked(cancelOnlineGame).mockRejectedValue(new ApiError(409, 'ONLINE_GAME_ALREADY_STARTED'))
    const { user } = renderGame()

    await user.click(await screen.findByRole('button', { name: 'Cancel game' }))

    expect(await screen.findByText('The game had already started, so it was not cancelled.')).toBeInTheDocument()
    expect(await screen.findByText('The game has started.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel game' })).not.toBeInTheDocument()
  })

  it('shows a game that was cancelled before the viewer opened it', async () => {
    vi.mocked(getOnlineGame).mockResolvedValue(cancelledGame)

    renderGame()

    expect(await screen.findByText(cancelledText)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ready' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel game' })).not.toBeInTheDocument()
    expect(heartbeatOnlineGame).not.toHaveBeenCalled()
  })
})

describe('heartbeat and deadline while pending', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(claimedAt))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function advance(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  }

  async function renderPending() {
    vi.mocked(getOnlineGame).mockResolvedValue(pendingGame)
    const rendered = renderGame(userEvent.setup({ advanceTimers: vi.advanceTimersByTime }))
    await advance(0)
    expect(screen.getByRole('button', { name: 'Ready' })).toBeInTheDocument()
    return rendered
  }

  it('sends a heartbeat at least every 10 seconds so the server knows the viewer is present', async () => {
    await renderPending()
    const before = vi.mocked(heartbeatOnlineGame).mock.calls.length

    await advance(30_000)

    expect(vi.mocked(heartbeatOnlineGame).mock.calls.length - before).toBeGreaterThanOrEqual(3)
    expect(heartbeatOnlineGame).toHaveBeenCalledWith(42)
  })

  it("learns of the opponent's Ready through the heartbeat", async () => {
    await renderPending()
    expect(screen.getByText('Alex is not ready yet')).toBeInTheDocument()

    vi.mocked(heartbeatOnlineGame).mockResolvedValue(opponentReady)
    await advance(10_000)

    expect(screen.getByText('Alex is ready')).toBeInTheDocument()
  })

  it('learns that the game started through the heartbeat', async () => {
    await renderPending()

    vi.mocked(heartbeatOnlineGame).mockResolvedValue(activeGame)
    await advance(10_000)

    expect(screen.getByText('The game has started.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ready' })).not.toBeInTheDocument()
  })

  it('counts down the three minutes left to get ready', async () => {
    await renderPending()

    expect(screen.getByText('Time left to get ready: 3:00')).toBeInTheDocument()

    await advance(61_000)

    expect(screen.getByText('Time left to get ready: 1:59')).toBeInTheDocument()
  })

  it('never counts below zero while waiting for the server to cancel', async () => {
    await renderPending()

    await advance(200_000)

    expect(screen.getByText('Time left to get ready: 0:00')).toBeInTheDocument()
  })

  it('shows the cancellation once the server reports the deadline passed, and stops the heartbeat', async () => {
    await renderPending()

    vi.mocked(heartbeatOnlineGame).mockResolvedValue(cancelledGame)
    await advance(10_000)

    expect(screen.getByText(cancelledText)).toBeInTheDocument()
    expect(screen.queryByText(/Time left to get ready/)).not.toBeInTheDocument()

    const calls = vi.mocked(heartbeatOnlineGame).mock.calls.length
    await advance(60_000)
    expect(vi.mocked(heartbeatOnlineGame).mock.calls.length).toBe(calls)
  })
})
