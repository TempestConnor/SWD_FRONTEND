import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { cancelOnlineGame, getOnlineGame, heartbeatOnlineGame, markReady, type OnlineGame } from './api'

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
