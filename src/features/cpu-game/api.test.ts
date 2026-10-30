import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { getCpuPosition, playCpuMove, startCpuGame, type CpuGameState, type CpuPosition } from './api'

vi.mock('../../api/client', () => ({ api: { GET: vi.fn(), POST: vi.fn() } }))

const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
const state: CpuGameState = {
  difficulty: 'HARD',
  playerColor: 'WHITE',
  cpuMove: 'e7e5',
  cpuMoveSan: 'e5',
  fen,
  sideToMove: 'WHITE',
  ply: 2,
  status: 'ACTIVE',
}
const position: CpuPosition = { fen, sideToMove: 'BLACK', ply: 1, status: 'ACTIVE', legalMoves: ['e7e5'] }

function ok(data: unknown) {
  return { data, response: new Response(null, { status: 200 }) } as never
}

function problem(status: number, body: unknown) {
  return { error: body, response: new Response(null, { status }) } as never
}

afterEach(() => {
  vi.resetAllMocks()
})

describe('cpu game api', () => {
  it('starts a game through POST /api/cpu-games', async () => {
    vi.mocked(api.POST).mockResolvedValue(ok(state))
    const body = { difficulty: 'EASY', playerColor: 'RANDOM' }

    await expect(startCpuGame(body)).resolves.toEqual(state)
    expect(api.POST).toHaveBeenCalledWith('/api/cpu-games', { body })
  })

  it('asks for the CPU reply with the full move list through POST /api/cpu-games/cpu-move', async () => {
    vi.mocked(api.POST).mockResolvedValue(ok(state))
    const body = { difficulty: 'HARD', playerColor: 'WHITE', moves: ['e2e4'] }

    await expect(playCpuMove(body)).resolves.toEqual(state)
    expect(api.POST).toHaveBeenCalledWith('/api/cpu-games/cpu-move', { body })
  })

  it("replays the position and legal moves through the backend's POST /api/local-games/state", async () => {
    vi.mocked(api.POST).mockResolvedValue(ok(position))

    await expect(getCpuPosition(['e2e4'])).resolves.toEqual(position)
    expect(api.POST).toHaveBeenCalledWith('/api/local-games/state', { body: { moves: ['e2e4'] } })
  })

  it('throws an ApiError carrying the errorCode when the engine is unavailable', async () => {
    vi.mocked(api.POST).mockResolvedValue(problem(503, { status: 503, errorCode: 'ENGINE_UNAVAILABLE' }))

    await expect(playCpuMove({ difficulty: 'EASY', playerColor: 'WHITE', moves: ['e2e4'] })).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      errorCode: 'ENGINE_UNAVAILABLE',
    })
  })

  it('never calls an online game, rating or history endpoint', async () => {
    vi.mocked(api.POST).mockResolvedValueOnce(ok(state)).mockResolvedValueOnce(ok(state)).mockResolvedValueOnce(ok(position))

    await startCpuGame({ difficulty: 'EASY', playerColor: 'WHITE' })
    await playCpuMove({ difficulty: 'EASY', playerColor: 'WHITE', moves: ['e2e4'] })
    await getCpuPosition(['e2e4'])

    expect(api.POST).toHaveBeenCalledTimes(3)
    expect(api.POST).toHaveBeenNthCalledWith(1, '/api/cpu-games', expect.anything())
    expect(api.POST).toHaveBeenNthCalledWith(2, '/api/cpu-games/cpu-move', expect.anything())
    expect(api.POST).toHaveBeenNthCalledWith(3, '/api/local-games/state', expect.anything())
    expect(api.GET).not.toHaveBeenCalled()
  })
})
