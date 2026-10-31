import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/errors'
import { clickMove, pieceOn } from '../../../test/board'
import { deferred } from '../../../test/deferred'
import { renderWithClient } from '../../../test/utils'
import {
  getMoves,
  getOnlineGame,
  heartbeatOnlineGame,
  makeMove,
  type GameMove,
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
const afterE5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
const afterNf3 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2'
const beforeMate = 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2'
const afterMate = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'
const stalemate = 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1'
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

const afterE4Game: OnlineGameData = { ...activeGame, currentFen: afterE4, lastPly: 1 }
const afterE5Game: OnlineGameData = { ...activeGame, currentFen: afterE5, lastPly: 2 }
const asBlack = (game: OnlineGameData): OnlineGameData => ({ ...game, viewerColor: 'BLACK' })

const e4: GameMove = { ply: 1, move: 'e2e4', san: 'e4', fen: afterE4 }
const e5: GameMove = { ply: 2, move: 'e7e5', san: 'e5', fen: afterE5 }
const nf3: GameMove = { ply: 3, move: 'g1f3', san: 'Nf3', fen: afterNf3 }

const illegalText = 'That move is not legal.'

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
})

afterEach(() => {
  vi.resetAllMocks()
})

describe('playing a move in an active online game', () => {
  it('says it is the viewer’s move when their side is to move', async () => {
    await renderLoaded(activeGame)

    expect(screen.getByText('Your move')).toBeInTheDocument()
  })

  it('submits a legal move at the next ply and shows the server’s position', async () => {
    vi.mocked(makeMove).mockResolvedValue(afterE4Game)
    const { user } = await renderLoaded(activeGame)

    await clickMove(user, 'e2e4')

    expect(makeMove).toHaveBeenCalledWith(42, { ply: 1, move: 'e2e4' })
    expect(await screen.findByText('Waiting for your opponent’s move')).toBeInTheDocument()
    expect(pieceOn('e4')).toBe('wP')
    expect(pieceOn('e2')).toBeNull()
  })

  it('shows the move at once while the server checks it', async () => {
    const reply = deferred<OnlineGameData>()
    vi.mocked(makeMove).mockReturnValue(reply.promise)
    const { user } = await renderLoaded(activeGame)

    await clickMove(user, 'e2e4')

    expect(pieceOn('e4')).toBe('wP')
    expect(pieceOn('e2')).toBeNull()
    await act(async () => reply.resolve(afterE4Game))
  })

  it('sends only one move when the player moves again before the server answers', async () => {
    const reply = deferred<OnlineGameData>()
    vi.mocked(makeMove).mockReturnValue(reply.promise)
    const { user } = await renderLoaded(activeGame)

    await clickMove(user, 'e2e4')
    await clickMove(user, 'd2d4')

    expect(makeMove).toHaveBeenCalledTimes(1)
    await act(async () => reply.resolve(afterE4Game))
    expect(pieceOn('d2')).toBe('wP')
  })

  it('submits the chosen piece with a promotion', async () => {
    const promotionFen = '7k/4P3/8/8/8/8/8/K7 w - - 0 1'
    vi.mocked(makeMove).mockResolvedValue({ ...activeGame, currentFen: '4N2k/8/8/8/8/8/8/K7 b - - 0 1', lastPly: 21 })
    const { user } = await renderLoaded({ ...activeGame, currentFen: promotionFen, lastPly: 20 })

    await clickMove(user, 'e7e8')
    await user.click(screen.getByRole('button', { name: 'Knight' }))

    expect(makeMove).toHaveBeenCalledWith(42, { ply: 21, move: 'e7e8n' })
  })

  it('does not let the viewer move on the opponent’s turn', async () => {
    const { user } = await renderLoaded(asBlack(activeGame))

    expect(screen.getByText('Waiting for your opponent’s move')).toBeInTheDocument()
    await clickMove(user, 'e7e5')

    expect(makeMove).not.toHaveBeenCalled()
    expect(pieceOn('e7')).toBe('bP')
  })
})

describe('rejected moves', () => {
  it('rejects a move that is not legal without contacting the server', async () => {
    const { user } = await renderLoaded(activeGame)

    await clickMove(user, 'e2e5')

    expect(await screen.findByRole('alert')).toHaveTextContent(illegalText)
    expect(makeMove).not.toHaveBeenCalled()
    expect(pieceOn('e2')).toBe('wP')
  })

  it('puts the piece back when the server finds the move illegal', async () => {
    vi.mocked(makeMove).mockRejectedValue(new ApiError(400, 'ILLEGAL_MOVE'))
    const { user } = await renderLoaded(activeGame)

    await clickMove(user, 'e2e4')

    expect(await screen.findByRole('alert')).toHaveTextContent(illegalText)
    expect(pieceOn('e2')).toBe('wP')
    expect(pieceOn('e4')).toBeNull()
  })

  it('reloads the latest position when the move was based on a stale board', async () => {
    vi.mocked(makeMove).mockRejectedValue(new ApiError(409, 'MOVE_OUT_OF_SEQUENCE'))
    const { user } = await renderLoaded(activeGame)
    vi.mocked(getOnlineGame).mockResolvedValue(afterE5Game)

    await clickMove(user, 'd2d4')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The game had moved on. The board now shows the latest position.',
    )
    expect(pieceOn('e4')).toBe('wP')
    expect(pieceOn('e5')).toBe('bP')
    expect(pieceOn('d2')).toBe('wP')
  })

  it.each([
    ['NOT_YOUR_TURN', 'It is not your turn.'],
    ['ONLINE_GAME_NOT_ACTIVE', 'This game is no longer in progress.'],
    ['TIME_EXPIRED', 'Your clock has run out.'],
    ['DISCONNECT_FORFEIT_DUE', 'This game has already ended.'],
  ])('explains a %s rejection and reloads the game', async (errorCode, text) => {
    vi.mocked(makeMove).mockRejectedValue(new ApiError(409, errorCode))
    const { user } = await renderLoaded(activeGame)
    const loads = vi.mocked(getOnlineGame).mock.calls.length

    await clickMove(user, 'e2e4')

    expect(await screen.findByRole('alert')).toHaveTextContent(text)
    expect(pieceOn('e2')).toBe('wP')
    await vi.waitFor(() => expect(vi.mocked(getOnlineGame).mock.calls.length).toBeGreaterThan(loads))
  })

  it('shows a move the server accepted although its reply was lost', async () => {
    vi.mocked(makeMove).mockRejectedValue(new ApiError(503, 'SERVICE_UNAVAILABLE'))
    const { user } = await renderLoaded(activeGame)
    vi.mocked(getOnlineGame).mockResolvedValue(afterE4Game)

    await clickMove(user, 'e2e4')

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(await screen.findByText('Waiting for your opponent’s move')).toBeInTheDocument()
    expect(pieceOn('e4')).toBe('wP')
  })
})

describe('games ended by a move', () => {
  it('shows the result when the viewer’s move checkmates', async () => {
    const mated: OnlineGameData = {
      ...asBlack(activeGame),
      status: 'COMPLETED',
      outcome: 'BLACK_WIN',
      terminationReason: 'CHECKMATE',
      endedAt: '2026-10-31T10:07:00Z',
      currentFen: afterMate,
      lastPly: 4,
    }
    vi.mocked(makeMove).mockResolvedValue(mated)
    const { user } = await renderLoaded({ ...asBlack(activeGame), currentFen: beforeMate, lastPly: 3 })

    await clickMove(user, 'd8h4')

    expect(makeMove).toHaveBeenCalledWith(42, { ply: 4, move: 'd8h4' })
    expect(await screen.findByText('Checkmate. You win.')).toBeInTheDocument()
    expect(pieceOn('h4')).toBe('bQ')
    expect(screen.queryByText('Your move')).not.toBeInTheDocument()
    expect(screen.queryByText('Waiting for your opponent’s move')).not.toBeInTheDocument()
  })

  it('shows the loss to the player who was checkmated', async () => {
    await renderLoaded({
      ...activeGame,
      status: 'COMPLETED',
      outcome: 'BLACK_WIN',
      terminationReason: 'CHECKMATE',
      currentFen: afterMate,
      lastPly: 4,
    })

    expect(screen.getByText('Checkmate. You lose.')).toBeInTheDocument()
  })

  it.each([
    ['STALEMATE', 'Draw by stalemate.'],
    ['INSUFFICIENT_MATERIAL', 'Draw by insufficient material.'],
    ['REPETITION', 'Draw by threefold repetition.'],
    ['MOVE_COUNT', 'Draw by the fifty-move rule.'],
  ])('shows a %s draw', async (terminationReason, text) => {
    await renderLoaded({ ...activeGame, status: 'COMPLETED', outcome: 'DRAW', terminationReason, currentFen: stalemate })

    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('accepts no moves once the game is over', async () => {
    const { user } = await renderLoaded({
      ...activeGame,
      status: 'COMPLETED',
      outcome: 'DRAW',
      terminationReason: 'STALEMATE',
      currentFen: afterE5,
      lastPly: 2,
    })

    expect(screen.getByText('Draw by stalemate.')).toBeInTheDocument()
    await clickMove(user, 'g1f3')

    expect(makeMove).not.toHaveBeenCalled()
    expect(pieceOn('g1')).toBe('wN')
    expect(screen.queryByText('Your move')).not.toBeInTheDocument()
  })
})

describe('position and move order after a refresh', () => {
  it('shows the server’s position and the moves in ply order', async () => {
    vi.mocked(getMoves).mockResolvedValue([e4, e5, nf3])

    await renderLoaded(asBlack({ ...activeGame, currentFen: afterNf3, lastPly: 3 }))

    const list = await screen.findByRole('list', { name: 'Moves' })
    const items = await within(list).findAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('e4')
    expect(items[1]).toHaveTextContent('e5')
    expect(items[2]).toHaveTextContent('Nf3')
    expect(getMoves).toHaveBeenCalledWith(42)
    expect(pieceOn('f3')).toBe('wN')
    expect(screen.getByText('Your move')).toBeInTheDocument()
  })

  it('adds an accepted move to the move list', async () => {
    vi.mocked(makeMove).mockResolvedValue(afterE4Game)
    const { user } = await renderLoaded(activeGame)
    vi.mocked(getMoves).mockResolvedValue([e4])

    await clickMove(user, 'e2e4')

    const list = await screen.findByRole('list', { name: 'Moves' })
    expect(await within(list).findByText('e4')).toBeInTheDocument()
  })
})

describe('the opponent’s moves', () => {
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

  it('shows the opponent’s move learned through the heartbeat', async () => {
    vi.mocked(getOnlineGame).mockResolvedValue(asBlack(activeGame))
    vi.mocked(heartbeatOnlineGame).mockResolvedValue(asBlack(activeGame))
    renderGame(userEvent.setup({ advanceTimers: vi.advanceTimersByTime }))
    await advance(0)
    expect(screen.getByText('Waiting for your opponent’s move')).toBeInTheDocument()

    vi.mocked(heartbeatOnlineGame).mockResolvedValue(asBlack(afterE4Game))
    vi.mocked(getMoves).mockResolvedValue([e4])
    await advance(10_000)

    expect(pieceOn('e4')).toBe('wP')
    expect(screen.getByText('Your move')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Moves' })).getByText('e4')).toBeInTheDocument()
  })
})

describe('captured pieces', () => {
  it('shows the pieces each side has captured and the material lead', async () => {
    const afterExd5 = 'rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2'
    vi.mocked(getMoves).mockResolvedValue([
      e4,
      { ply: 2, move: 'd7d5', san: 'd5' },
      { ply: 3, move: 'e4d5', san: 'exd5', fen: afterExd5 },
    ])

    await renderLoaded(asBlack({ ...activeGame, currentFen: afterExd5, lastPly: 3 }))

    const white = await screen.findByRole('group', { name: 'Captured by White' })
    expect(await within(white).findByText('Pawn')).toBeInTheDocument()
    expect(within(white).getByText('+1')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Captured by Black' })).queryByRole('listitem')).not.toBeInTheDocument()
  })
})
