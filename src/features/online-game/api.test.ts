import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import {
  cancelOnlineGame,
  getMoves,
  getOnlineGame,
  heartbeatOnlineGame,
  makeMove,
  markReady,
  resignOnlineGame,
  voteToAbandon,
  type GameMove,
  type OnlineGame,
} from './api'

vi.mock('../../api/client', () => ({ api: { GET: vi.fn(), POST: vi.fn() } }))

const game: OnlineGame = { id: 42, source: 'INVITE', status: 'PENDING', viewerColor: 'WHITE' }

afterEach(() => {
  vi.resetAllMocks()
})

describe('online game api', () => {
  it('reads a game through GET /api/online-games/{gameId}', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: game, response: new Response(null, { status: 200 }) } as never)

    await expect(getOnlineGame(42)).resolves.toEqual(game)
    expect(api.GET).toHaveBeenCalledWith('/api/online-games/{gameId}', { params: { path: { gameId: 42 } } })
  })

  it('throws an ApiError carrying ONLINE_GAME_NOT_FOUND for a game the viewer does not play in', async () => {
    vi.mocked(api.GET).mockResolvedValue({
      error: { status: 404, errorCode: 'ONLINE_GAME_NOT_FOUND' },
      response: new Response(null, { status: 404 }),
    } as never)

    await expect(getOnlineGame(42)).rejects.toMatchObject({ name: 'ApiError', errorCode: 'ONLINE_GAME_NOT_FOUND' })
  })
})

describe('ready and start api', () => {
  const ok = (data: OnlineGame) => ({ data, response: new Response(null, { status: 200 }) }) as never

  it('marks the viewer ready through POST /api/online-games/{gameId}/ready', async () => {
    vi.mocked(api.POST).mockResolvedValue(ok(game))

    await expect(markReady(42)).resolves.toEqual(game)
    expect(api.POST).toHaveBeenCalledWith('/api/online-games/{gameId}/ready', { params: { path: { gameId: 42 } } })
  })

  it('cancels a pending game through POST /api/online-games/{gameId}/cancel', async () => {
    const cancelled: OnlineGame = { ...game, status: 'CANCELLED', terminationReason: 'PRE_START_CANCEL' }
    vi.mocked(api.POST).mockResolvedValue(ok(cancelled))

    await expect(cancelOnlineGame(42)).resolves.toEqual(cancelled)
    expect(api.POST).toHaveBeenCalledWith('/api/online-games/{gameId}/cancel', { params: { path: { gameId: 42 } } })
  })

  it('throws ONLINE_GAME_ALREADY_STARTED when a cancel loses the race with the start', async () => {
    vi.mocked(api.POST).mockResolvedValue({
      error: { status: 409, errorCode: 'ONLINE_GAME_ALREADY_STARTED' },
      response: new Response(null, { status: 409 }),
    } as never)

    await expect(cancelOnlineGame(42)).rejects.toMatchObject({
      name: 'ApiError',
      errorCode: 'ONLINE_GAME_ALREADY_STARTED',
    })
  })

  it('sends a heartbeat through POST /api/online-games/{gameId}/heartbeat', async () => {
    vi.mocked(api.POST).mockResolvedValue(ok(game))

    await expect(heartbeatOnlineGame(42)).resolves.toEqual(game)
    expect(api.POST).toHaveBeenCalledWith('/api/online-games/{gameId}/heartbeat', {
      params: { path: { gameId: 42 } },
    })
  })
})

describe('move api', () => {
  const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) }) as never
  const problem = (status: number, errorCode: string) =>
    ({ error: { status, errorCode }, response: new Response(null, { status }) }) as never

  it('submits a move with its expected ply through POST /api/online-games/{gameId}/moves', async () => {
    const moved: OnlineGame = { ...game, status: 'ACTIVE', lastPly: 1 }
    vi.mocked(api.POST).mockResolvedValue(ok(moved))

    await expect(makeMove(42, { ply: 1, move: 'e2e4' })).resolves.toEqual(moved)
    expect(api.POST).toHaveBeenCalledWith('/api/online-games/{gameId}/moves', {
      params: { path: { gameId: 42 } },
      body: { ply: 1, move: 'e2e4' },
    })
  })

  it.each(['ILLEGAL_MOVE', 'NOT_YOUR_TURN', 'MOVE_OUT_OF_SEQUENCE', 'ONLINE_GAME_NOT_ACTIVE', 'TIME_EXPIRED'])(
    'throws an ApiError carrying %s for a rejected move',
    async (errorCode) => {
      vi.mocked(api.POST).mockResolvedValue(problem(errorCode === 'ILLEGAL_MOVE' ? 400 : 409, errorCode))

      await expect(makeMove(42, { ply: 1, move: 'e2e4' })).rejects.toMatchObject({ name: 'ApiError', errorCode })
    },
  )

  it('reads the accepted moves in ply order through GET /api/online-games/{gameId}/moves', async () => {
    const moves: GameMove[] = [
      { ply: 1, move: 'e2e4', san: 'e4' },
      { ply: 2, move: 'e7e5', san: 'e5' },
    ]
    vi.mocked(api.GET).mockResolvedValue(ok(moves))

    await expect(getMoves(42)).resolves.toEqual(moves)
    expect(api.GET).toHaveBeenCalledWith('/api/online-games/{gameId}/moves', { params: { path: { gameId: 42 } } })
  })
})

describe('resign and abandon api', () => {
  const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) }) as never
  const problem = (status: number, errorCode: string) =>
    ({ error: { status, errorCode }, response: new Response(null, { status }) }) as never

  it('resigns through POST /api/online-games/{gameId}/resign', async () => {
    const resigned: OnlineGame = { ...game, status: 'COMPLETED', outcome: 'BLACK_WIN', terminationReason: 'RESIGNATION' }
    vi.mocked(api.POST).mockResolvedValue(ok(resigned))

    await expect(resignOnlineGame(42)).resolves.toEqual(resigned)
    expect(api.POST).toHaveBeenCalledWith('/api/online-games/{gameId}/resign', { params: { path: { gameId: 42 } } })
  })

  it('votes to abandon through POST /api/online-games/{gameId}/abandon', async () => {
    const voted: OnlineGame = { ...game, status: 'ACTIVE', white: { abandonVoted: true } }
    vi.mocked(api.POST).mockResolvedValue(ok(voted))

    await expect(voteToAbandon(42)).resolves.toEqual(voted)
    expect(api.POST).toHaveBeenCalledWith('/api/online-games/{gameId}/abandon', { params: { path: { gameId: 42 } } })
  })

  it('throws ONLINE_GAME_NOT_ACTIVE for a late resignation or vote', async () => {
    vi.mocked(api.POST).mockResolvedValue(problem(409, 'ONLINE_GAME_NOT_ACTIVE'))

    await expect(resignOnlineGame(42)).rejects.toMatchObject({ name: 'ApiError', errorCode: 'ONLINE_GAME_NOT_ACTIVE' })
    await expect(voteToAbandon(42)).rejects.toMatchObject({ name: 'ApiError', errorCode: 'ONLINE_GAME_NOT_ACTIVE' })
  })
})
