import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/errors'
import { deferred } from '../../../test/deferred'
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
const cancelled: QueueRequest = { ...queued, status: 'CANCELLED', leftAt: '2026-10-31T10:00:20.000Z' }
const timedOut: QueueRequest = { ...queued, status: 'TIMED_OUT', leftAt: '2026-10-31T10:00:30.000Z' }

const neverQueued = new ApiError(404, 'QUEUE_REQUEST_NOT_FOUND')

const findButton = () => screen.findByRole('button', { name: 'Find opponent' })
const searching = () => screen.queryByText('Searching for an opponent…')
const connectionWarning = () => screen.queryByText(/Connection problem/)

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

async function renderMatchmaking() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const rendered = renderWithClient(<Matchmaking />)
  await advance(0)
  return { user, ...rendered }
}

async function renderSearching(request: QueueRequest = queued) {
  vi.mocked(joinQueue).mockResolvedValue(request)
  const rendered = await renderMatchmaking()
  await rendered.user.click(await findButton())
  expect(await screen.findByText('Searching for an opponent…')).toBeInTheDocument()
  vi.mocked(heartbeatQueue).mockClear()
  vi.mocked(heartbeatQueue).mockResolvedValue(request)
  return rendered
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(joinedAt))
  vi.mocked(heartbeatQueue).mockRejectedValue(neverQueued)
})

afterEach(() => {
  vi.useRealTimers()
  vi.resetAllMocks()
})

describe('joining the queue', () => {
  it('offers a rated classical game with the fixed 30+10 clock', async () => {
    await renderMatchmaking()

    expect(screen.getByRole('heading', { name: 'Play online' })).toBeInTheDocument()
    expect(screen.getByText('Rated game')).toBeInTheDocument()
    expect(screen.getByText('30 min + 10 s')).toBeInTheDocument()
    expect(await findButton()).toBeEnabled()
    expect(searching()).not.toBeInTheDocument()
  })

  it('joins the classical standard queue and shows the search with the rating captured on entry', async () => {
    vi.mocked(joinQueue).mockResolvedValue(queued)
    const { user } = await renderMatchmaking()

    await user.click(await findButton())

    expect(joinQueue).toHaveBeenCalledWith({ mode: 'CLASSICAL', variant: 'STANDARD' })
    expect(await screen.findByText('Searching for an opponent…')).toBeInTheDocument()
    expect(screen.getByText('Your rating: 1200')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leave queue' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Find opponent' })).not.toBeInTheDocument()
  })

  it('sends one join while the first is in flight', async () => {
    const pending = deferred<QueueRequest>()
    vi.mocked(joinQueue).mockReturnValue(pending.promise)
    const { user } = await renderMatchmaking()

    await user.click(await findButton())

    expect(screen.getByRole('button', { name: 'Joining…' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Joining…' }))
    expect(joinQueue).toHaveBeenCalledTimes(1)

    await act(async () => pending.resolve(queued))
    expect(await screen.findByText('Searching for an opponent…')).toBeInTheDocument()
  })

  it('says when matchmaking is unavailable and stays out of the queue', async () => {
    vi.mocked(joinQueue).mockRejectedValue(new ApiError(503, 'MATCHMAKING_UNAVAILABLE'))
    const { user } = await renderMatchmaking()

    await user.click(await findButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Matchmaking is not available right now. Please try again later.',
    )
    expect(await findButton()).toBeEnabled()
    expect(searching()).not.toBeInTheDocument()
  })

  it('shows a generic message when the join fails for another reason', async () => {
    vi.mocked(joinQueue).mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR'))
    const { user } = await renderMatchmaking()

    await user.click(await findButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(await findButton()).toBeEnabled()
  })
})

describe('keeping the place in the queue', () => {
  it('sends a heartbeat at the interval the server asks for while queued', async () => {
    await renderSearching()

    await advance(10_000)
    expect(heartbeatQueue).toHaveBeenCalledTimes(1)

    await advance(20_000)
    expect(heartbeatQueue).toHaveBeenCalledTimes(3)
    expect(searching()).toBeInTheDocument()
  })

  it('follows a shorter interval from the server', async () => {
    await renderSearching({ ...queued, heartbeatIntervalSeconds: 5 })

    await advance(10_000)

    expect(heartbeatQueue).toHaveBeenCalledTimes(2)
  })

  it('shows that the search ended when the server timed the request out, and stops the heartbeat', async () => {
    await renderSearching()
    vi.mocked(heartbeatQueue).mockResolvedValue(timedOut)

    await advance(10_000)

    expect(screen.getByText('Your search ended because the connection was lost.')).toBeInTheDocument()
    expect(searching()).not.toBeInTheDocument()
    expect(await findButton()).toBeEnabled()

    vi.mocked(heartbeatQueue).mockClear()
    await advance(60_000)
    expect(heartbeatQueue).not.toHaveBeenCalled()
  })

  it('lets the player search again after a timeout', async () => {
    const { user } = await renderSearching()
    vi.mocked(heartbeatQueue).mockResolvedValue(timedOut)
    await advance(10_000)

    vi.mocked(joinQueue).mockClear()
    await user.click(await findButton())

    expect(joinQueue).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Searching for an opponent…')).toBeInTheDocument()
    expect(screen.queryByText('Your search ended because the connection was lost.')).not.toBeInTheDocument()
  })

  it('warns while heartbeats fail, keeps trying, and clears the warning once one gets through', async () => {
    await renderSearching()
    vi.mocked(heartbeatQueue).mockRejectedValue(new TypeError('Failed to fetch'))

    await advance(10_000)

    expect(connectionWarning()).toBeInTheDocument()
    expect(searching()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leave queue' })).toBeEnabled()

    vi.mocked(heartbeatQueue).mockResolvedValue(queued)
    await advance(10_000)

    expect(heartbeatQueue).toHaveBeenCalledTimes(2)
    expect(connectionWarning()).not.toBeInTheDocument()
    expect(searching()).toBeInTheDocument()
  })
})

describe('leaving the queue', () => {
  it('leaves immediately and returns to the join view', async () => {
    const { user } = await renderSearching()
    vi.mocked(cancelQueue).mockResolvedValue(cancelled)

    await user.click(screen.getByRole('button', { name: 'Leave queue' }))

    expect(cancelQueue).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('You left the queue.')).toBeInTheDocument()
    expect(searching()).not.toBeInTheDocument()
    expect(await findButton()).toBeEnabled()
  })

  it('stops the heartbeat after leaving', async () => {
    const { user } = await renderSearching()
    vi.mocked(cancelQueue).mockResolvedValue(cancelled)
    await user.click(screen.getByRole('button', { name: 'Leave queue' }))
    await screen.findByText('You left the queue.')

    vi.mocked(heartbeatQueue).mockClear()
    await advance(60_000)

    expect(heartbeatQueue).not.toHaveBeenCalled()
  })

  it('sends one cancel while the first is in flight', async () => {
    const { user } = await renderSearching()
    const pending = deferred<QueueRequest>()
    vi.mocked(cancelQueue).mockReturnValue(pending.promise)

    await user.click(screen.getByRole('button', { name: 'Leave queue' }))

    expect(screen.getByRole('button', { name: 'Leaving…' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Leaving…' }))
    expect(cancelQueue).toHaveBeenCalledTimes(1)

    await act(async () => pending.resolve(cancelled))
    expect(await screen.findByText('You left the queue.')).toBeInTheDocument()
  })

  it('treats a request the server no longer knows as already left', async () => {
    const { user } = await renderSearching()
    vi.mocked(cancelQueue).mockRejectedValue(neverQueued)

    await user.click(screen.getByRole('button', { name: 'Leave queue' }))

    expect(await findButton()).toBeEnabled()
    expect(searching()).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('stays in the queue and says so when leaving fails', async () => {
    const { user } = await renderSearching()
    vi.mocked(cancelQueue).mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR'))

    await user.click(screen.getByRole('button', { name: 'Leave queue' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(searching()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leave queue' })).toBeEnabled()
  })
})

describe('arriving on the page', () => {
  it('resumes a search that is still open, e.g. after a refresh or from another tab', async () => {
    vi.mocked(heartbeatQueue).mockResolvedValue(queued)
    await renderMatchmaking()

    expect(await screen.findByText('Searching for an opponent…')).toBeInTheDocument()
    expect(screen.getByText('Your rating: 1200')).toBeInTheDocument()
    expect(joinQueue).not.toHaveBeenCalled()

    await advance(10_000)
    expect(heartbeatQueue).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['cancelled', cancelled],
    ['timed out', timedOut],
  ])('shows the join view, without old notices, when the last request was %s', async (_label, request) => {
    vi.mocked(heartbeatQueue).mockResolvedValue(request)
    await renderMatchmaking()

    expect(await findButton()).toBeEnabled()
    expect(searching()).not.toBeInTheDocument()
    expect(screen.queryByText('You left the queue.')).not.toBeInTheDocument()
    expect(screen.queryByText('Your search ended because the connection was lost.')).not.toBeInTheDocument()

    await advance(60_000)
    expect(heartbeatQueue).toHaveBeenCalledTimes(1)
  })

  it('offers a retry when the queue status cannot be read', async () => {
    vi.mocked(heartbeatQueue).mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR'))
    const { user } = await renderMatchmaking()

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(screen.queryByRole('button', { name: 'Find opponent' })).not.toBeInTheDocument()

    vi.mocked(heartbeatQueue).mockRejectedValue(neverQueued)
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await findButton()).toBeEnabled()
  })
})
