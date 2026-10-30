import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { getLocalPosition, startLocalGame, type LocalGame, type LocalPosition } from './api'

vi.mock('../../api/client', () => ({ api: { GET: vi.fn(), POST: vi.fn() } }))

const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const position: LocalPosition = { fen: initialFen, sideToMove: 'WHITE', ply: 0, status: 'ACTIVE', legalMoves: ['e2e4'] }
const game: LocalGame = { clock: { enabled: true, initialMinutes: 30, incrementSeconds: 10 }, position }

function ok(data: unknown) {
  return { data, response: new Response(null, { status: 200 }) } as never
}

function problem(status: number, body: unknown) {
  return { error: body, response: new Response(null, { status }) } as never
}

afterEach(() => {
  vi.resetAllMocks()
})

describe('local game api', () => {
  it('starts a game through POST /api/local-games', async () => {
    vi.mocked(api.POST).mockResolvedValue(ok(game))
    const body = { clockEnabled: true, initialMinutes: 30, incrementSeconds: 10 }

    await expect(startLocalGame(body)).resolves.toEqual(game)
    expect(api.POST).toHaveBeenCalledWith('/api/local-games', { body })
  })

  it('replays the full move list through POST /api/local-games/state', async () => {
    vi.mocked(api.POST).mockResolvedValue(ok(position))

    await expect(getLocalPosition(['e2e4', 'e7e5'])).resolves.toEqual(position)
    expect(api.POST).toHaveBeenCalledWith('/api/local-games/state', { body: { moves: ['e2e4', 'e7e5'] } })
  })

  it('throws an ApiError carrying the errorCode when the move list is illegal', async () => {
    vi.mocked(api.POST).mockResolvedValue(problem(400, { status: 400, errorCode: 'ILLEGAL_MOVE_SEQUENCE' }))

    await expect(getLocalPosition(['e2e5'])).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      errorCode: 'ILLEGAL_MOVE_SEQUENCE',
    })
  })

  it('never calls an online game or history endpoint', async () => {
    vi.mocked(api.POST).mockResolvedValueOnce(ok(game)).mockResolvedValueOnce(ok(position))

    await startLocalGame({})
    await getLocalPosition([])

    expect(api.POST).toHaveBeenCalledTimes(2)
    expect(api.POST).toHaveBeenNthCalledWith(1, '/api/local-games', expect.anything())
    expect(api.POST).toHaveBeenNthCalledWith(2, '/api/local-games/state', expect.anything())
    expect(api.GET).not.toHaveBeenCalled()
  })
})
