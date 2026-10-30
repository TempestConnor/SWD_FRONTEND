import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { getHistoryGame, getMatchHistory, type HistoryGame, type MatchHistoryPage } from './api'

vi.mock('../../api/client', () => ({ api: { GET: vi.fn() } }))

const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) }) as never
const problem = (status: number, errorCode: string) =>
  ({ error: { status, errorCode }, response: new Response(null, { status }) }) as never

afterEach(() => {
  vi.resetAllMocks()
})

describe('match history api', () => {
  it('reads one page of the caller’s history through GET /api/match-history with page and size', async () => {
    const page: MatchHistoryPage = { content: [], page: 1, size: 20, totalElements: 21, totalPages: 2, last: true }
    vi.mocked(api.GET).mockResolvedValue(ok(page))

    await expect(getMatchHistory(1)).resolves.toEqual(page)
    expect(api.GET).toHaveBeenCalledWith('/api/match-history', { params: { query: { page: 1, size: 20 } } })
  })

  it('reads one finished game through GET /api/match-history/{gameId}', async () => {
    const game: HistoryGame = { gameId: 42, viewerColor: 'WHITE', result: 'WIN' }
    vi.mocked(api.GET).mockResolvedValue(ok(game))

    await expect(getHistoryGame(42)).resolves.toEqual(game)
    expect(api.GET).toHaveBeenCalledWith('/api/match-history/{gameId}', { params: { path: { gameId: 42 } } })
  })

  it('throws GAME_NOT_IN_HISTORY for a game of the caller that has not finished', async () => {
    vi.mocked(api.GET).mockResolvedValue(problem(404, 'GAME_NOT_IN_HISTORY'))

    await expect(getHistoryGame(42)).rejects.toMatchObject({ name: 'ApiError', errorCode: 'GAME_NOT_IN_HISTORY' })
  })
})
