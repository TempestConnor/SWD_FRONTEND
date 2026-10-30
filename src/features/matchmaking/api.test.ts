import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { cancelQueue, heartbeatQueue, joinQueue, type QueueRequest } from './api'

vi.mock('../../api/client', () => ({ api: { GET: vi.fn(), POST: vi.fn() } }))

const queued: QueueRequest = {
  id: 5,
  status: 'QUEUED',
  mode: 'CLASSICAL',
  variant: 'STANDARD',
  ratingAtEntry: 1200,
  joinedAt: '2026-10-31T10:00:00Z',
  heartbeatAt: '2026-10-31T10:00:00Z',
  heartbeatIntervalSeconds: 10,
}

function ok(data: unknown, status = 200) {
  return { data, response: new Response(null, { status }) } as never
}

function problem(status: number, body: unknown) {
  return { error: body, response: new Response(null, { status }) } as never
}

afterEach(() => {
  vi.resetAllMocks()
})

describe('matchmaking api', () => {
  it('joins the queue through POST /api/matchmaking/join', async () => {
    vi.mocked(api.POST).mockResolvedValue(ok(queued))
    const body = { mode: 'CLASSICAL', variant: 'STANDARD' }

    await expect(joinQueue(body)).resolves.toEqual(queued)
    expect(api.POST).toHaveBeenCalledWith('/api/matchmaking/join', { body })
  })

  it('refreshes the queue request through POST /api/matchmaking/heartbeat', async () => {
    vi.mocked(api.POST).mockResolvedValue(ok(queued))

    await expect(heartbeatQueue()).resolves.toEqual(queued)
    expect(api.POST).toHaveBeenCalledWith('/api/matchmaking/heartbeat')
  })

  it('leaves the queue through POST /api/matchmaking/cancel', async () => {
    vi.mocked(api.POST).mockResolvedValue(ok({ ...queued, status: 'CANCELLED' }))

    await expect(cancelQueue()).resolves.toMatchObject({ status: 'CANCELLED' })
    expect(api.POST).toHaveBeenCalledWith('/api/matchmaking/cancel')
  })

  it('throws an ApiError carrying 503 MATCHMAKING_UNAVAILABLE when the queue is closed', async () => {
    vi.mocked(api.POST).mockResolvedValue(problem(503, { status: 503, errorCode: 'MATCHMAKING_UNAVAILABLE' }))

    await expect(joinQueue({ mode: 'CLASSICAL', variant: 'STANDARD' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      errorCode: 'MATCHMAKING_UNAVAILABLE',
    })
  })

  it('throws an ApiError carrying 404 QUEUE_REQUEST_NOT_FOUND for a player who never queued', async () => {
    vi.mocked(api.POST).mockResolvedValue(problem(404, { status: 404, errorCode: 'QUEUE_REQUEST_NOT_FOUND' }))

    await expect(heartbeatQueue()).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      errorCode: 'QUEUE_REQUEST_NOT_FOUND',
    })
  })
})
