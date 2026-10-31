import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/errors'
import { clickMove, pieceOn } from '../../../test/board'
import { replayPosition } from '../../../test/fakeChessServer'
import { renderWithClient } from '../../../test/utils'
import { getLocalPosition, startLocalGame, type StartLocalGameRequest } from '../api'
import { LOCAL_GAME_STORAGE_KEY, type StoredLocalGame } from '../storage'
import { LocalGame } from './LocalGame'

vi.mock('../api', () => ({ startLocalGame: vi.fn(), getLocalPosition: vi.fn() }))

const defaultClock = { enabled: true, initialMinutes: 30, incrementSeconds: 10 }
const promotionSetup = ['h2h4', 'g7g5', 'h4g5', 'h7h6', 'g5h6', 'f8g7', 'h6g7', 'e7e6']
const foolsMateSetup = ['f2f3', 'e7e5', 'g2g4']
const threefoldRepetition = ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8']

/** Mirrors the backend: omitted fields fall back to an enabled 30+10 clock. */
function effectiveClock(body: StartLocalGameRequest) {
  if (body.clockEnabled === false) {
    return { enabled: false }
  }
  return { enabled: true, initialMinutes: body.initialMinutes ?? 30, incrementSeconds: body.incrementSeconds ?? 10 }
}

function storeGame(game: Partial<StoredLocalGame>) {
  const stored: StoredLocalGame = {
    clock: defaultClock,
    moves: [],
    remainingMs: { white: 1_800_000, black: 1_800_000 },
    timedOut: null,
    savedAt: Date.now(),
    ...game,
  }
  localStorage.setItem(LOCAL_GAME_STORAGE_KEY, JSON.stringify(stored))
}

function storedGame(): StoredLocalGame | null {
  const raw = localStorage.getItem(LOCAL_GAME_STORAGE_KEY)
  return raw === null ? null : (JSON.parse(raw) as StoredLocalGame)
}

function renderGame(user = userEvent.setup()) {
  return { user, ...renderWithClient(<LocalGame />) }
}

async function startDefaultGame() {
  const rendered = renderGame()
  await rendered.user.click(await screen.findByRole('button', { name: 'Start game' }))
  await screen.findByText('White to move')
  return rendered
}

function clock(side: 'White' | 'Black') {
  return screen.getByRole('timer', { name: `${side} clock` })
}

beforeEach(() => {
  vi.mocked(startLocalGame).mockImplementation(async (body) => ({
    clock: effectiveClock(body),
    position: replayPosition([]),
  }))
  vi.mocked(getLocalPosition).mockImplementation(async (moves) => replayPosition(moves))
})

afterEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
})

describe('local game setup', () => {
  it('offers the default 30+10 clock', async () => {
    renderGame()

    expect(await screen.findByRole('heading', { name: 'Local game' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Use a clock' })).toBeChecked()
    expect(screen.getByLabelText('Initial time (minutes)')).toHaveValue(30)
    expect(screen.getByLabelText('Increment (seconds)')).toHaveValue(10)
  })

  it('starts a game with the default clock', async () => {
    await startDefaultGame()

    expect(startLocalGame).toHaveBeenCalledWith({ clockEnabled: true, initialMinutes: 30, incrementSeconds: 10 })
    expect(clock('White')).toHaveTextContent('30:00')
    expect(clock('Black')).toHaveTextContent('30:00')
    expect(pieceOn('e2')).toBe('wP')
  })

  it('starts a game with a custom clock', async () => {
    const { user } = renderGame()

    await user.clear(await screen.findByLabelText('Initial time (minutes)'))
    await user.type(screen.getByLabelText('Initial time (minutes)'), '5')
    await user.clear(screen.getByLabelText('Increment (seconds)'))
    await user.type(screen.getByLabelText('Increment (seconds)'), '0')
    await user.click(screen.getByRole('button', { name: 'Start game' }))

    expect(await screen.findByText('White to move')).toBeInTheDocument()
    expect(startLocalGame).toHaveBeenCalledWith({ clockEnabled: true, initialMinutes: 5, incrementSeconds: 0 })
    expect(clock('White')).toHaveTextContent('5:00')
  })

  it('starts an untimed game without an increment when the clock is disabled', async () => {
    const { user } = renderGame()

    await user.click(await screen.findByRole('checkbox', { name: 'Use a clock' }))
    await user.click(screen.getByRole('button', { name: 'Start game' }))

    expect(await screen.findByText('White to move')).toBeInTheDocument()
    expect(startLocalGame).toHaveBeenCalledWith({ clockEnabled: false })
    expect(screen.queryAllByRole('timer')).toHaveLength(0)
  })

  it.each([
    ['4', 'Initial time (minutes)', 'Initial time must be between 5 and 120 minutes.'],
    ['121', 'Initial time (minutes)', 'Initial time must be between 5 and 120 minutes.'],
    ['61', 'Increment (seconds)', 'Increment must be between 0 and 60 seconds.'],
  ])('rejects %s in %s', async (value, label, message) => {
    const { user } = renderGame()

    await user.clear(await screen.findByLabelText(label))
    await user.type(screen.getByLabelText(label), value)
    await user.click(screen.getByRole('button', { name: 'Start game' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(startLocalGame).not.toHaveBeenCalled()
  })

  it('shows an error and stays on setup when the game cannot be started', async () => {
    vi.mocked(startLocalGame).mockRejectedValue(new ApiError(503, 'UNKNOWN_ERROR'))
    const { user } = renderGame()

    await user.click(await screen.findByRole('button', { name: 'Start game' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(screen.getByRole('button', { name: 'Start game' })).toBeInTheDocument()
  })
})

describe('local game moves', () => {
  it('alternates White and Black after legal moves', async () => {
    const { user } = await startDefaultGame()

    await clickMove(user, 'e2e4')

    expect(await screen.findByText('Black to move')).toBeInTheDocument()
    expect(getLocalPosition).toHaveBeenLastCalledWith(['e2e4'])
    await waitFor(() => expect(pieceOn('e4')).toBe('wP'))

    await clickMove(user, 'e7e5')

    expect(await screen.findByText('White to move')).toBeInTheDocument()
    expect(getLocalPosition).toHaveBeenLastCalledWith(['e2e4', 'e7e5'])
    await waitFor(() => expect(pieceOn('e5')).toBe('bP'))
  })

  it('keeps the position unchanged and shows an error for an illegal move', async () => {
    const { user } = await startDefaultGame()

    await clickMove(user, 'e2e5')

    expect(await screen.findByRole('alert')).toHaveTextContent('That move is not legal.')
    expect(getLocalPosition).not.toHaveBeenCalledWith(['e2e5'])
    expect(pieceOn('e2')).toBe('wP')
    expect(pieceOn('e5')).toBeNull()
    expect(screen.getByText('White to move')).toBeInTheDocument()
  })

  it("rejects moving the opponent's piece", async () => {
    const { user } = await startDefaultGame()

    await clickMove(user, 'e7e5')

    expect(await screen.findByRole('alert')).toHaveTextContent('That move is not legal.')
    expect(pieceOn('e7')).toBe('bP')
    expect(screen.getByText('White to move')).toBeInTheDocument()
  })

  it('rejects repeating a move that was already played', async () => {
    const { user } = await startDefaultGame()
    await clickMove(user, 'e2e4')
    await screen.findByText('Black to move')

    await clickMove(user, 'e2e4')

    expect(await screen.findByRole('alert')).toHaveTextContent('That move is not legal.')
    expect(storedGame()?.moves).toEqual(['e2e4'])
    expect(screen.getByText('Black to move')).toBeInTheDocument()
  })

  it('rolls back a move the server rejects', async () => {
    vi.mocked(getLocalPosition).mockImplementation(async (moves) => {
      if (moves.length > 0) {
        throw new ApiError(400, 'ILLEGAL_MOVE_SEQUENCE')
      }
      return replayPosition(moves)
    })
    const { user } = await startDefaultGame()

    await clickMove(user, 'e2e4')

    expect(await screen.findByRole('alert')).toHaveTextContent('That move is not legal.')
    await waitFor(() => expect(pieceOn('e2')).toBe('wP'))
    expect(pieceOn('e4')).toBeNull()
    expect(screen.getByText('White to move')).toBeInTheDocument()
    expect(storedGame()?.moves).toEqual([])
  })

  it('promotes a pawn to the piece the player picks', async () => {
    storeGame({ moves: promotionSetup })
    const { user } = renderGame()
    await screen.findByText('White to move')

    await clickMove(user, 'g7h8')
    const dialog = await screen.findByRole('dialog', { name: 'Choose a promotion piece' })
    expect(screen.getByRole('button', { name: 'Queen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rook' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bishop' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Knight' }))

    await waitFor(() => expect(getLocalPosition).toHaveBeenLastCalledWith([...promotionSetup, 'g7h8n']))
    expect(dialog).not.toBeInTheDocument()
    await waitFor(() => expect(pieceOn('h8')).toBe('wN'))
    expect(await screen.findByText('Black to move')).toBeInTheDocument()
  })
})

describe('local game end', () => {
  it('announces checkmate and accepts no further moves', async () => {
    storeGame({ moves: foolsMateSetup })
    const { user } = renderGame()
    await screen.findByText('Black to move')

    await clickMove(user, 'd8h4')

    expect(await screen.findByText('Checkmate. Black wins.')).toBeInTheDocument()
    const calls = vi.mocked(getLocalPosition).mock.calls.length
    await clickMove(user, 'e2e4')
    expect(getLocalPosition).toHaveBeenCalledTimes(calls)
    expect(pieceOn('e2')).toBe('wP')
  })

  it('announces a draw', async () => {
    storeGame({ moves: threefoldRepetition })
    renderGame()

    expect(await screen.findByText('Draw by threefold repetition.')).toBeInTheDocument()
  })

  it('starts over from setup with New game and forgets the finished game', async () => {
    storeGame({ moves: [...foolsMateSetup, 'd8h4'] })
    const { user } = renderGame()

    await user.click(await screen.findByRole('button', { name: 'New game' }))

    expect(await screen.findByRole('button', { name: 'Start game' })).toBeInTheDocument()
    expect(storedGame()).toBeNull()
  })
})

describe('local game storage', () => {
  it('saves every move to browser storage', async () => {
    const { user } = await startDefaultGame()

    await clickMove(user, 'e2e4')
    await screen.findByText('Black to move')

    expect(storedGame()).toMatchObject({ clock: defaultClock, moves: ['e2e4'], timedOut: null })
  })

  it('restores an active game after refresh', async () => {
    const { user, unmount } = await startDefaultGame()
    await clickMove(user, 'e2e4')
    await screen.findByText('Black to move')

    unmount()
    renderGame()

    expect(await screen.findByText('Black to move')).toBeInTheDocument()
    expect(getLocalPosition).toHaveBeenLastCalledWith(['e2e4'])
    await waitFor(() => expect(pieceOn('e4')).toBe('wP'))
    expect(screen.queryByRole('button', { name: 'Start game' })).not.toBeInTheDocument()
  })

  it('starts fresh when the stored game is corrupt', async () => {
    localStorage.setItem(LOCAL_GAME_STORAGE_KEY, '{not json')

    renderGame()

    expect(await screen.findByRole('button', { name: 'Start game' })).toBeInTheDocument()
    expect(localStorage.getItem(LOCAL_GAME_STORAGE_KEY)).toBeNull()
  })

  it('starts fresh when the server rejects the stored moves', async () => {
    storeGame({ moves: ['e2e5'] })

    renderGame()

    expect(await screen.findByText('The saved game could not be restored.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start game' })).toBeInTheDocument()
    expect(storedGame()).toBeNull()
  })
})

describe('local game clock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-30T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function advance(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  }

  function renderTimedGame() {
    const rendered = renderGame(userEvent.setup({ advanceTimers: vi.advanceTimersByTime }))
    return rendered
  }

  it('counts down only the clock of the side to move', async () => {
    storeGame({ moves: ['e2e4'], remainingMs: { white: 1_810_000, black: 1_800_000 } })
    renderTimedGame()
    await advance(0)
    expect(screen.getByText('Black to move')).toBeInTheDocument()

    await advance(5_000)

    expect(clock('Black')).toHaveTextContent('29:55')
    expect(clock('White')).toHaveTextContent('30:10')
  })

  it('adds the increment after a move', async () => {
    storeGame({ moves: [] })
    const { user } = renderTimedGame()
    await advance(0)

    await clickMove(user, 'e2e4')
    await advance(0)

    expect(screen.getByText('Black to move')).toBeInTheDocument()
    expect(clock('White')).toHaveTextContent('30:10')
    expect(clock('Black')).toHaveTextContent('30:00')
  })

  it('ends the game when the side to move runs out of time', async () => {
    storeGame({ moves: ['e2e4'], remainingMs: { white: 1_810_000, black: 3_000 } })
    const { user } = renderTimedGame()
    await advance(0)

    await advance(3_000)

    expect(screen.getByText('Black ran out of time. White wins.')).toBeInTheDocument()
    expect(clock('Black')).toHaveTextContent('0:00')
    expect(storedGame()?.timedOut).toBe('BLACK')

    await clickMove(user, 'e7e5')
    await advance(0)
    expect(getLocalPosition).not.toHaveBeenCalledWith(['e2e4', 'e7e5'])
  })

  it('restores a game that ended on time', async () => {
    storeGame({ moves: ['e2e4'], remainingMs: { white: 1_810_000, black: 0 }, timedOut: 'BLACK' })
    renderTimedGame()
    await advance(0)

    expect(screen.getByText('Black ran out of time. White wins.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New game' })).toBeInTheDocument()
  })
})

describe('local game record', () => {
  it('lists every move in SAN as it is played', async () => {
    const { user } = await startDefaultGame()
    await clickMove(user, 'e2e4')
    await screen.findByText('Black to move')
    await clickMove(user, 'd7d5')
    await screen.findByText('White to move')

    const list = screen.getByRole('list', { name: 'Moves' })
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['e4', 'd5'])
  })

  it('shows the pieces each side has captured and the material lead', async () => {
    storeGame({ moves: ['e2e4', 'd7d5', 'e4d5'] })

    renderGame()

    const white = await screen.findByRole('group', { name: 'Captured by White' })
    expect(within(white).getByText('Pawn')).toBeInTheDocument()
    expect(within(white).getByText('+1')).toBeInTheDocument()
    const black = screen.getByRole('group', { name: 'Captured by Black' })
    expect(within(black).queryByRole('listitem')).not.toBeInTheDocument()
    expect(within(black).queryByText(/^\+/)).not.toBeInTheDocument()
  })
})
