import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/errors'
import { clickMove, pieceOn } from '../../../test/board'
import { deferred } from '../../../test/deferred'
import { fakeCpuMove, fakeCpuStart, replayPosition } from '../../../test/fakeChessServer'
import { renderWithClient } from '../../../test/utils'
import { getCpuPosition, playCpuMove, startCpuGame, type CpuGameState } from '../api'
import { CPU_GAME_STORAGE_KEY, type StoredCpuGame } from '../storage'
import { CpuGame } from './CpuGame'

vi.mock('../api', () => ({ startCpuGame: vi.fn(), playCpuMove: vi.fn(), getCpuPosition: vi.fn() }))

const defaultClock = { enabled: true, initialMinutes: 30, incrementSeconds: 10 }
// The fake CPU plays the first legal move in UCI order: a7a5 after 1. e4, and a2a3 when it opens as White.
const promotionSetup = ['h2h4', 'g7g5', 'h4g5', 'h7h6', 'g5h6', 'f8g7', 'h6g7', 'e7e6']
const foolsMateSetup = ['f2f3', 'e7e5', 'g2g4']
const threefoldRepetition = ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8']

function storeGame(game: Partial<StoredCpuGame>) {
  const stored: StoredCpuGame = {
    difficulty: 'MEDIUM',
    playerColor: 'WHITE',
    clock: defaultClock,
    moves: [],
    remainingMs: 1_800_000,
    timedOut: false,
    savedAt: Date.now(),
    ...game,
  }
  localStorage.setItem(CPU_GAME_STORAGE_KEY, JSON.stringify(stored))
}

function storedGame(): StoredCpuGame | null {
  const raw = localStorage.getItem(CPU_GAME_STORAGE_KEY)
  return raw === null ? null : (JSON.parse(raw) as StoredCpuGame)
}

function renderGame(user = userEvent.setup()) {
  return { user, ...renderWithClient(<CpuGame />) }
}

async function startDefaultGame() {
  const rendered = renderGame()
  await rendered.user.click(await screen.findByRole('button', { name: 'Start game' }))
  await screen.findByText('Your move')
  return rendered
}

function playerClock() {
  return screen.getByRole('timer', { name: 'Your clock' })
}

beforeEach(() => {
  vi.mocked(startCpuGame).mockImplementation(async (body) =>
    fakeCpuStart(body.difficulty, body.playerColor === 'BLACK' ? 'BLACK' : 'WHITE'),
  )
  vi.mocked(playCpuMove).mockImplementation(async (body) => fakeCpuMove(body))
  vi.mocked(getCpuPosition).mockImplementation(async (moves) => replayPosition(moves))
})

afterEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('cpu game setup', () => {
  it('offers three difficulties, a color choice and the default 30+10 clock', async () => {
    renderGame()

    expect(await screen.findByRole('heading', { name: 'Play the computer' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Easy' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Hard' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'White' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Black' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Random' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Use a clock' })).toBeChecked()
    expect(screen.getByLabelText('Initial time (minutes)')).toHaveValue(30)
    expect(screen.getByLabelText('Increment (seconds)')).toHaveValue(10)
  })

  it.each([
    ['Easy', 'EASY'],
    ['Medium', 'MEDIUM'],
    ['Hard', 'HARD'],
  ])('plays against the %s CPU', async (label, difficulty) => {
    const { user } = renderGame()

    await user.click(await screen.findByRole('radio', { name: label }))
    await user.click(screen.getByRole('button', { name: 'Start game' }))
    await screen.findByText('Your move')
    await clickMove(user, 'e2e4')

    await waitFor(() => expect(pieceOn('a5')).toBe('bP'))
    expect(startCpuGame).toHaveBeenCalledWith({ difficulty, playerColor: 'WHITE' })
    expect(playCpuMove).toHaveBeenCalledWith({ difficulty, playerColor: 'WHITE', moves: ['e2e4'] })
  })

  it('starts as White with the full board and the player to move', async () => {
    await startDefaultGame()

    expect(pieceOn('e2')).toBe('wP')
    expect(pieceOn('e7')).toBe('bP')
    expect(playerClock()).toHaveTextContent('30:00')
    expect(storedGame()).toMatchObject({ difficulty: 'MEDIUM', playerColor: 'WHITE', moves: [] })
  })

  it("starts as Black with the CPU's opening move already played", async () => {
    const { user } = renderGame()

    await user.click(await screen.findByRole('radio', { name: 'Black' }))
    await user.click(screen.getByRole('button', { name: 'Start game' }))

    expect(await screen.findByText('Your move')).toBeInTheDocument()
    expect(startCpuGame).toHaveBeenCalledWith({ difficulty: 'MEDIUM', playerColor: 'BLACK' })
    await waitFor(() => expect(pieceOn('a3')).toBe('wP'))
    expect(pieceOn('a2')).toBeNull()
    expect(storedGame()).toMatchObject({ playerColor: 'BLACK', moves: ['a2a3'] })
  })

  it('plays the color the backend picks for Random', async () => {
    vi.mocked(startCpuGame).mockImplementation(async (body) => fakeCpuStart(body.difficulty, 'BLACK'))
    const { user } = renderGame()

    await user.click(await screen.findByRole('radio', { name: 'Random' }))
    await user.click(screen.getByRole('button', { name: 'Start game' }))

    expect(await screen.findByText('Your move')).toBeInTheDocument()
    expect(startCpuGame).toHaveBeenCalledWith({ difficulty: 'MEDIUM', playerColor: 'RANDOM' })
    await waitFor(() => expect(pieceOn('a3')).toBe('wP'))
    expect(storedGame()).toMatchObject({ playerColor: 'BLACK', moves: ['a2a3'] })
  })

  it('starts a game with a custom clock', async () => {
    const { user } = renderGame()

    await user.clear(await screen.findByLabelText('Initial time (minutes)'))
    await user.type(screen.getByLabelText('Initial time (minutes)'), '5')
    await user.clear(screen.getByLabelText('Increment (seconds)'))
    await user.type(screen.getByLabelText('Increment (seconds)'), '0')
    await user.click(screen.getByRole('button', { name: 'Start game' }))

    expect(await screen.findByText('Your move')).toBeInTheDocument()
    expect(playerClock()).toHaveTextContent('5:00')
    expect(storedGame()).toMatchObject({ clock: { enabled: true, initialMinutes: 5, incrementSeconds: 0 } })
  })

  it('starts an untimed game without an increment when the clock is disabled', async () => {
    const { user } = renderGame()

    await user.click(await screen.findByRole('checkbox', { name: 'Use a clock' }))
    await user.click(screen.getByRole('button', { name: 'Start game' }))

    expect(await screen.findByText('Your move')).toBeInTheDocument()
    expect(screen.queryAllByRole('timer')).toHaveLength(0)
    expect(storedGame()).toMatchObject({ clock: { enabled: false }, remainingMs: null })
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
    expect(startCpuGame).not.toHaveBeenCalled()
  })

  it('shows an error and stays on setup when the game cannot be started', async () => {
    vi.mocked(startCpuGame).mockRejectedValue(new ApiError(503, 'ENGINE_UNAVAILABLE'))
    const { user } = renderGame()

    await user.click(await screen.findByRole('button', { name: 'Start game' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(screen.getByRole('button', { name: 'Start game' })).toBeInTheDocument()
  })
})

describe('cpu game moves', () => {
  it("answers the player's legal move with the CPU's move", async () => {
    const { user } = await startDefaultGame()

    await clickMove(user, 'e2e4')

    await waitFor(() => expect(pieceOn('a5')).toBe('bP'))
    expect(pieceOn('e4')).toBe('wP')
    expect(playCpuMove).toHaveBeenCalledWith({ difficulty: 'MEDIUM', playerColor: 'WHITE', moves: ['e2e4'] })
    expect(await screen.findByText('Your move')).toBeInTheDocument()
  })

  it('shows the CPU is thinking and accepts no move until it replies', async () => {
    const reply = deferred<CpuGameState>()
    vi.mocked(playCpuMove).mockReturnValue(reply.promise)
    const { user } = await startDefaultGame()

    await clickMove(user, 'e2e4')

    expect(await screen.findByText('The CPU is thinking…')).toBeInTheDocument()
    await clickMove(user, 'd2d4')
    expect(playCpuMove).toHaveBeenCalledTimes(1)
    expect(getCpuPosition).not.toHaveBeenCalledWith(['e2e4', 'd2d4'])

    await act(async () => reply.resolve(fakeCpuMove({ difficulty: 'MEDIUM', playerColor: 'WHITE', moves: ['e2e4'] })))

    expect(await screen.findByText('Your move')).toBeInTheDocument()
    await waitFor(() => expect(pieceOn('a5')).toBe('bP'))
  })

  it('keeps the position unchanged and shows an error for an illegal move', async () => {
    const { user } = await startDefaultGame()

    await clickMove(user, 'e2e5')

    expect(await screen.findByRole('alert')).toHaveTextContent('That move is not legal.')
    expect(playCpuMove).not.toHaveBeenCalled()
    expect(pieceOn('e2')).toBe('wP')
    expect(pieceOn('e5')).toBeNull()
    expect(screen.getByText('Your move')).toBeInTheDocument()
  })

  it("rejects moving the CPU's pieces", async () => {
    const { user } = await startDefaultGame()

    await clickMove(user, 'e7e5')

    expect(await screen.findByRole('alert')).toHaveTextContent('That move is not legal.')
    expect(playCpuMove).not.toHaveBeenCalled()
    expect(pieceOn('e7')).toBe('bP')
  })

  it('rolls back a move the server rejects', async () => {
    const illegal = new ApiError(400, 'ILLEGAL_MOVE_SEQUENCE')
    vi.mocked(getCpuPosition).mockImplementation(async (moves) => {
      if (moves.length > 0) {
        throw illegal
      }
      return replayPosition(moves)
    })
    vi.mocked(playCpuMove).mockRejectedValue(illegal)
    const { user } = await startDefaultGame()

    await clickMove(user, 'e2e4')

    expect(await screen.findByRole('alert')).toHaveTextContent('That move is not legal.')
    await waitFor(() => expect(pieceOn('e2')).toBe('wP'))
    expect(pieceOn('e4')).toBeNull()
    expect(screen.getByText('Your move')).toBeInTheDocument()
    expect(storedGame()?.moves).toEqual([])
  })

  it('promotes a pawn to the piece the player picks', async () => {
    storeGame({ moves: promotionSetup })
    const { user } = renderGame()
    await screen.findByText('Your move')

    await clickMove(user, 'g7h8')
    const dialog = await screen.findByRole('dialog', { name: 'Choose a promotion piece' })
    await user.click(screen.getByRole('button', { name: 'Knight' }))

    await waitFor(() =>
      expect(playCpuMove).toHaveBeenCalledWith({
        difficulty: 'MEDIUM',
        playerColor: 'WHITE',
        moves: [...promotionSetup, 'g7h8n'],
      }),
    )
    expect(dialog).not.toBeInTheDocument()
    await waitFor(() => expect(pieceOn('h8')).toBe('wN'))
    expect(await screen.findByText('Your move')).toBeInTheDocument()
  })

  it('lets the player retry when the CPU engine is unavailable', async () => {
    vi.mocked(playCpuMove).mockRejectedValue(new ApiError(503, 'ENGINE_UNAVAILABLE'))
    const { user } = await startDefaultGame()

    await clickMove(user, 'e2e4')

    expect(await screen.findByRole('alert')).toHaveTextContent('The CPU could not move. Please try again.')
    expect(storedGame()?.moves).toEqual(['e2e4'])
    vi.mocked(playCpuMove).mockImplementation(async (body) => fakeCpuMove(body))
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Your move')).toBeInTheDocument()
    await waitFor(() => expect(pieceOn('a5')).toBe('bP'))
    expect(storedGame()?.moves).toEqual(['e2e4', 'a7a5'])
  })
})

describe('cpu game end', () => {
  it('announces when the player checkmates the CPU and accepts no further moves', async () => {
    storeGame({ playerColor: 'BLACK', moves: foolsMateSetup })
    const { user } = renderGame()
    await screen.findByText('Your move')

    await clickMove(user, 'd8h4')

    expect(await screen.findByText('Checkmate. You win.')).toBeInTheDocument()
    expect(storedGame()?.moves).toEqual([...foolsMateSetup, 'd8h4'])
    await clickMove(user, 'e7e6')
    expect(pieceOn('e7')).toBe('bP')
    expect(storedGame()?.moves).toEqual([...foolsMateSetup, 'd8h4'])
  })

  it('announces when the CPU checkmates the player', async () => {
    vi.mocked(playCpuMove).mockImplementation(async (body) => fakeCpuMove(body, () => 'd8h4'))
    storeGame({ moves: ['f2f3', 'e7e5'] })
    const { user } = renderGame()
    await screen.findByText('Your move')

    await clickMove(user, 'g2g4')

    expect(await screen.findByText('Checkmate. The CPU wins.')).toBeInTheDocument()
    await waitFor(() => expect(pieceOn('h4')).toBe('bQ'))
  })

  it('announces a draw', async () => {
    storeGame({ moves: threefoldRepetition })
    renderGame()

    expect(await screen.findByText('Draw by threefold repetition.')).toBeInTheDocument()
  })

  it('starts over from setup with New game and forgets the finished game', async () => {
    storeGame({ playerColor: 'BLACK', moves: [...foolsMateSetup, 'd8h4'] })
    const { user } = renderGame()

    await user.click(await screen.findByRole('button', { name: 'New game' }))

    expect(await screen.findByRole('button', { name: 'Start game' })).toBeInTheDocument()
    expect(storedGame()).toBeNull()
  })
})

describe('cpu game storage', () => {
  it('saves every move to browser storage', async () => {
    const { user } = await startDefaultGame()

    await clickMove(user, 'e2e4')
    await waitFor(() => expect(pieceOn('a5')).toBe('bP'))

    expect(storedGame()).toMatchObject({
      difficulty: 'MEDIUM',
      playerColor: 'WHITE',
      clock: defaultClock,
      moves: ['e2e4', 'a7a5'],
      timedOut: false,
    })
  })

  it("restores an active game on the player's turn after refresh", async () => {
    storeGame({ moves: ['e2e4', 'a7a5'] })

    renderGame()

    expect(await screen.findByText('Your move')).toBeInTheDocument()
    await waitFor(() => expect(pieceOn('a5')).toBe('bP'))
    expect(getCpuPosition).toHaveBeenLastCalledWith(['e2e4', 'a7a5'])
    expect(playCpuMove).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Start game' })).not.toBeInTheDocument()
  })

  it('asks the CPU again when the page was refreshed during its calculation', async () => {
    storeGame({ difficulty: 'HARD', moves: ['e2e4'] })

    renderGame()

    expect(await screen.findByText('Your move')).toBeInTheDocument()
    expect(playCpuMove).toHaveBeenCalledWith({ difficulty: 'HARD', playerColor: 'WHITE', moves: ['e2e4'] })
    await waitFor(() => expect(pieceOn('a5')).toBe('bP'))
    expect(storedGame()?.moves).toEqual(['e2e4', 'a7a5'])
  })

  it('ignores a CPU reply that arrives after a new game started', async () => {
    const staleReply = deferred<CpuGameState>()
    vi.mocked(playCpuMove).mockReturnValueOnce(staleReply.promise)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { user } = await startDefaultGame()
    await clickMove(user, 'e2e4')
    await screen.findByText('The CPU is thinking…')

    await user.click(screen.getByRole('button', { name: 'New game' }))
    await user.click(await screen.findByRole('button', { name: 'Start game' }))
    await screen.findByText('Your move')
    await act(async () =>
      staleReply.resolve(fakeCpuMove({ difficulty: 'MEDIUM', playerColor: 'WHITE', moves: ['e2e4'] })),
    )

    expect(screen.getByText('Your move')).toBeInTheDocument()
    expect(pieceOn('e2')).toBe('wP')
    expect(pieceOn('a7')).toBe('bP')
    expect(pieceOn('a5')).toBeNull()
    expect(storedGame()?.moves).toEqual([])
  })

  it('starts fresh when nothing is stored', async () => {
    renderGame()

    expect(await screen.findByRole('button', { name: 'Start game' })).toBeInTheDocument()
    expect(getCpuPosition).not.toHaveBeenCalled()
    expect(playCpuMove).not.toHaveBeenCalled()
  })

  it('starts fresh when the stored game is corrupt', async () => {
    localStorage.setItem(CPU_GAME_STORAGE_KEY, '{not json')

    renderGame()

    expect(await screen.findByRole('button', { name: 'Start game' })).toBeInTheDocument()
    expect(localStorage.getItem(CPU_GAME_STORAGE_KEY)).toBeNull()
  })

  it.each([
    ["the CPU's turn", ['e2e5']],
    ["the player's turn", ['e2e5', 'e7e5']],
  ])('starts fresh when the server rejects stored moves on %s', async (_turn, moves) => {
    storeGame({ moves })

    renderGame()

    expect(await screen.findByText('The saved game could not be restored.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start game' })).toBeInTheDocument()
    expect(storedGame()).toBeNull()
  })
})

describe('cpu game clock', () => {
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
    return renderGame(userEvent.setup({ advanceTimers: vi.advanceTimersByTime }))
  }

  it('shows a clock for the player only', async () => {
    storeGame({ moves: ['e2e4', 'a7a5'] })
    renderTimedGame()
    await advance(0)

    expect(screen.getAllByRole('timer')).toHaveLength(1)
    expect(playerClock()).toHaveTextContent('30:00')
  })

  it("counts down on the player's turn", async () => {
    storeGame({ moves: ['e2e4', 'a7a5'], remainingMs: 1_810_000 })
    renderTimedGame()
    await advance(0)
    expect(screen.getByText('Your move')).toBeInTheDocument()

    await advance(5_000)

    expect(playerClock()).toHaveTextContent('30:05')
  })

  it('counts down for a player who plays Black after the CPU opens', async () => {
    storeGame({ playerColor: 'BLACK', moves: ['a2a3'] })
    renderTimedGame()
    await advance(0)

    await advance(5_000)

    expect(playerClock()).toHaveTextContent('29:55')
  })

  it('does not run before the first move of the game', async () => {
    storeGame({ moves: [] })
    renderTimedGame()
    await advance(0)

    await advance(5_000)

    expect(playerClock()).toHaveTextContent('30:00')
  })

  it('does not run while the CPU is thinking', async () => {
    vi.mocked(playCpuMove).mockReturnValue(new Promise(() => {}))
    storeGame({ moves: ['e2e4'], remainingMs: 1_810_000 })
    renderTimedGame()
    await advance(0)
    expect(screen.getByText('The CPU is thinking…')).toBeInTheDocument()

    await advance(5_000)

    expect(playerClock()).toHaveTextContent('30:10')
  })

  it("charges the player's thinking time and adds the increment after their move", async () => {
    storeGame({ moves: ['e2e4', 'a7a5'] })
    const { user } = renderTimedGame()
    await advance(0)
    await advance(2_000)

    await clickMove(user, 'd2d4')
    await advance(0)
    await waitFor(() => expect(pieceOn('a4')).toBe('bP'))

    expect(screen.getByText('Your move')).toBeInTheDocument()
    expect(playerClock()).toHaveTextContent('30:08')
  })

  it('ends the game when the player runs out of time', async () => {
    storeGame({ moves: ['e2e4', 'a7a5'], remainingMs: 3_000 })
    const { user } = renderTimedGame()
    await advance(0)

    await advance(3_000)

    expect(screen.getByText('You ran out of time. The CPU wins.')).toBeInTheDocument()
    expect(playerClock()).toHaveTextContent('0:00')
    expect(storedGame()).toMatchObject({ timedOut: true, remainingMs: 0 })

    await clickMove(user, 'd2d4')
    await advance(0)
    expect(playCpuMove).not.toHaveBeenCalled()
  })

  it('restores a game that ended on time', async () => {
    storeGame({ moves: ['e2e4', 'a7a5'], remainingMs: 0, timedOut: true })
    renderTimedGame()
    await advance(0)

    expect(screen.getByText('You ran out of time. The CPU wins.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New game' })).toBeInTheDocument()
  })
})
