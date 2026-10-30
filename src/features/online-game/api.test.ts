import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { getOnlineGame, type OnlineGame } from './api'

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
