import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/errors'
import { renderWithClient } from '../../../test/utils'
import { cancelQueue, heartbeatQueue, joinQueue, type QueueRequest } from '../api'
import { Matchmaking } from './Matchmaking'

vi.mock('../api', () => ({
  joinQueue: vi.fn(),
  heartbeatQueue: vi.fn(),
  cancelQueue: vi.fn(),
}))

const joinedAt = '2026-10-31T10:00:00.000Z'

const queued: QueueRequest = {
  id: 5,
  status: 'QUEUED',
  mode: 'CLASSICAL',
  variant: 'STANDARD',
  ratingAtEntry: 1200,
  joinedAt,
  heartbeatAt: joinedAt,
  heartbeatIntervalSeconds: 10,
}
const matched: QueueRequest = { ...queued, status: 'MATCHED', leftAt: '2026-10-31T10:00:08.000Z', gameId: 42 }

const searching = () => screen.queryByText('Searching for an opponent…')
const matchFound = () => screen.queryByText('Opponent found. Opening the game…')

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

async function renderSearching(onMatched = vi.fn()) {
  vi.mocked(joinQueue).mockResolvedValue(queued)
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  renderWithClient(<Matchmaking onMatched={onMatched} />)
  await advance(0)
  await user.click(await screen.findByRole('button', { name: 'Find opponent' }))
  expect(await screen.findByText('Searching for an opponent…')).toBeInTheDocument()
  vi.mocked(heartbeatQueue).mockClear()
  vi.mocked(heartbeatQueue).mockResolvedValue(queued)
  return { user, onMatched }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(joinedAt))
  vi.mocked(heartbeatQueue).mockRejectedValue(new ApiError(404, 'QUEUE_REQUEST_NOT_FOUND'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.resetAllMocks()
})

describe('being paired', () => {
  it('opens the pending game once a heartbeat reports the request as matched', async () => {
    const { onMatched } = await renderSearching()
    vi.mocked(heartbeatQueue).mockResolvedValue(matched)

    await advance(10_000)

    expect(onMatched).toHaveBeenCalledTimes(1)
    expect(onMatched).toHaveBeenCalledWith(42)
  })

  it('says an opponent was found instead of searching, without a way to leave or rejoin', async () => {
    await renderSearching()
    vi.mocked(heartbeatQueue).mockResolvedValue(matched)

    await advance(10_000)

    expect(matchFound()).toBeInTheDocument()
    expect(searching()).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Leave queue' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Find opponent' })).not.toBeInTheDocument()
  })

  it('stops the queue heartbeat once matched', async () => {
    const { onMatched } = await renderSearching()
    vi.mocked(heartbeatQueue).mockResolvedValue(matched)
    await advance(10_000)

    vi.mocked(heartbeatQueue).mockClear()
    await advance(60_000)

    expect(heartbeatQueue).not.toHaveBeenCalled()
    expect(onMatched).toHaveBeenCalledTimes(1)
  })

  it('opens the game when leaving loses the race to pairing', async () => {
    const { user, onMatched } = await renderSearching()
    vi.mocked(cancelQueue).mockResolvedValue(matched)

    await user.click(screen.getByRole('button', { name: 'Leave queue' }))

    expect(onMatched).toHaveBeenCalledWith(42)
    expect(await screen.findByText('Opponent found. Opening the game…')).toBeInTheDocument()
    expect(screen.queryByText('You left the queue.')).not.toBeInTheDocument()
  })
})
