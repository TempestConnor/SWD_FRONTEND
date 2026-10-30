import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/errors'
import { renderWithClient } from '../../../test/utils'
import {
  cancelInvitation,
  createInvitation,
  getInvitation,
  type CreatedInvitation,
  type Invitation,
} from '../api'
import { INVITATION_STORAGE_KEY } from '../storage'
import { InvitationHost } from './InvitationHost'

vi.mock('../api', () => ({
  createInvitation: vi.fn(),
  getInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
  claimInvitation: vi.fn(),
}))

const createdAt = '2026-10-31T10:00:00.000Z'
const expiresAt = '2026-10-31T10:15:00.000Z'

const openInvitation: Invitation = {
  id: 3,
  status: 'OPEN',
  hostColor: 'RANDOM',
  rated: true,
  mode: 'CLASSICAL',
  variant: 'STANDARD',
  clock: { enabled: true, initialMinutes: 30, incrementSeconds: 10 },
  createdAt,
  expiresAt,
}

function created(invitation: Partial<Invitation> = {}): CreatedInvitation {
  return { token: 'tok_abc', invitation: { ...openInvitation, ...invitation } }
}

const claimed: Invitation = { ...openInvitation, status: 'CLAIMED', claimedAt: createdAt, gameId: 42 }

function renderHost(user = userEvent.setup()) {
  const onClaimed = vi.fn()
  return { user, onClaimed, ...renderWithClient(<InvitationHost onClaimed={onClaimed} />) }
}

function storedInvitation(): unknown {
  const raw = sessionStorage.getItem(INVITATION_STORAGE_KEY)
  return raw === null ? null : JSON.parse(raw)
}

async function createDefaultInvitation(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Create invitation' }))
  await screen.findByRole('textbox', { name: 'Invitation link' })
}

beforeEach(() => {
  vi.mocked(createInvitation).mockResolvedValue(created())
  vi.mocked(getInvitation).mockResolvedValue(openInvitation)
})

afterEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
  sessionStorage.clear()
})

describe('invitation setup', () => {
  it('offers a color choice and the default rated 30+10 clock', async () => {
    renderHost()

    expect(await screen.findByRole('heading', { name: 'Invite a friend' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'White' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Black' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Random' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Use a clock' })).toBeChecked()
    expect(screen.getByLabelText('Initial time (minutes)')).toHaveValue(30)
    expect(screen.getByLabelText('Increment (seconds)')).toHaveValue(10)
    expect(screen.getByText('Rated game')).toBeInTheDocument()
  })

  it('shows that a changed clock makes the game unrated', async () => {
    const { user } = renderHost()

    const initial = await screen.findByLabelText('Initial time (minutes)')
    await user.clear(initial)
    await user.type(initial, '15')

    expect(screen.getByText('Unrated game')).toBeInTheDocument()
    expect(screen.queryByText('Rated game')).not.toBeInTheDocument()
  })

  it('shows that a disabled clock makes the game unrated', async () => {
    const { user } = renderHost()

    await user.click(await screen.findByRole('checkbox', { name: 'Use a clock' }))

    expect(screen.getByText('Unrated game')).toBeInTheDocument()
  })

  it('creates the invitation with the chosen color and default clock', async () => {
    const { user } = renderHost()

    await user.click(await screen.findByRole('radio', { name: 'Black' }))
    await createDefaultInvitation(user)

    expect(createInvitation).toHaveBeenCalledWith({
      hostColor: 'BLACK',
      clockEnabled: true,
      initialMinutes: 30,
      incrementSeconds: 10,
    })
  })

  it('sends a disabled clock without timing', async () => {
    vi.mocked(createInvitation).mockResolvedValue(created({ rated: false, clock: { enabled: false } }))
    const { user } = renderHost()

    await user.click(await screen.findByRole('checkbox', { name: 'Use a clock' }))
    await createDefaultInvitation(user)

    expect(createInvitation).toHaveBeenCalledWith({ hostColor: 'RANDOM', clockEnabled: false })
  })

  it.each([
    ['Initial time (minutes)', '4', 'Initial time must be between 5 and 120 minutes.'],
    ['Initial time (minutes)', '121', 'Initial time must be between 5 and 120 minutes.'],
    ['Increment (seconds)', '61', 'Increment must be between 0 and 60 seconds.'],
  ])('rejects %s = %s without calling the backend', async (label, value, message) => {
    const { user } = renderHost()

    const field = await screen.findByLabelText(label)
    await user.clear(field)
    await user.type(field, value)
    await user.click(screen.getByRole('button', { name: 'Create invitation' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(createInvitation).not.toHaveBeenCalled()
  })

  it('creates only one invitation when the button is pressed twice', async () => {
    let resolve: (value: CreatedInvitation) => void = () => {}
    vi.mocked(createInvitation).mockImplementation(() => new Promise((settle) => (resolve = settle)))
    const { user } = renderHost()

    const button = await screen.findByRole('button', { name: 'Create invitation' })
    await user.click(button)
    await user.click(button)
    resolve(created())

    await screen.findByRole('textbox', { name: 'Invitation link' })
    expect(createInvitation).toHaveBeenCalledTimes(1)
  })

  it('shows a generic error when the invitation cannot be created', async () => {
    vi.mocked(createInvitation).mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR'))
    const { user } = renderHost()

    await user.click(await screen.findByRole('button', { name: 'Create invitation' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(screen.getByRole('button', { name: 'Create invitation' })).toBeEnabled()
  })
})

describe('waiting for the opponent', () => {
  it('shows the shareable link built from the token', async () => {
    const { user } = renderHost()

    await createDefaultInvitation(user)

    expect(screen.getByRole('textbox', { name: 'Invitation link' })).toHaveValue(
      `${window.location.origin}/invite/tok_abc`,
    )
    expect(screen.getByText('Waiting for your opponent to join…')).toBeInTheDocument()
  })

  it('copies the link to the clipboard', async () => {
    const { user } = renderHost()
    await createDefaultInvitation(user)

    await user.click(screen.getByRole('button', { name: 'Copy link' }))

    await expect(navigator.clipboard.readText()).resolves.toBe(`${window.location.origin}/invite/tok_abc`)
    expect(await screen.findByText('Link copied')).toBeInTheDocument()
  })

  it("shows the server's rated flag and clock for the invitation", async () => {
    vi.mocked(createInvitation).mockResolvedValue(
      created({ rated: false, clock: { enabled: true, initialMinutes: 15, incrementSeconds: 0 } }),
    )
    const { user } = renderHost()

    await createDefaultInvitation(user)

    expect(screen.getByText('Unrated game')).toBeInTheDocument()
    expect(screen.getByText('15 min + 0 s')).toBeInTheDocument()
  })

  it('shows "No clock" for an invitation without a clock', async () => {
    vi.mocked(createInvitation).mockResolvedValue(created({ rated: false, clock: { enabled: false } }))
    const { user } = renderHost()

    await user.click(await screen.findByRole('checkbox', { name: 'Use a clock' }))
    await createDefaultInvitation(user)

    expect(screen.getByText('No clock')).toBeInTheDocument()
  })

  it('keeps the invitation in session storage so a refresh can show the link again', async () => {
    const { user } = renderHost()

    await createDefaultInvitation(user)

    expect(storedInvitation()).toEqual({ id: 3, token: 'tok_abc' })
  })

  it('restores the waiting invitation after a refresh', async () => {
    sessionStorage.setItem(INVITATION_STORAGE_KEY, JSON.stringify({ id: 3, token: 'tok_abc' }))

    renderHost()

    expect(await screen.findByRole('textbox', { name: 'Invitation link' })).toHaveValue(
      `${window.location.origin}/invite/tok_abc`,
    )
    expect(getInvitation).toHaveBeenCalledWith(3)
    expect(createInvitation).not.toHaveBeenCalled()
  })

  it('drops a stored invitation the server no longer knows and shows the setup form', async () => {
    sessionStorage.setItem(INVITATION_STORAGE_KEY, JSON.stringify({ id: 3, token: 'tok_abc' }))
    vi.mocked(getInvitation).mockRejectedValue(new ApiError(404, 'INVITATION_NOT_FOUND'))

    renderHost()

    expect(await screen.findByRole('button', { name: 'Create invitation' })).toBeInTheDocument()
    expect(storedInvitation()).toBeNull()
  })

  it('opens the game straight away when a restored invitation was claimed meanwhile', async () => {
    sessionStorage.setItem(INVITATION_STORAGE_KEY, JSON.stringify({ id: 3, token: 'tok_abc' }))
    vi.mocked(getInvitation).mockResolvedValue(claimed)

    const { onClaimed } = renderHost()

    await waitFor(() => expect(onClaimed).toHaveBeenCalledWith(42))
    expect(storedInvitation()).toBeNull()
  })
})

describe('cancelling', () => {
  it('cancels an open invitation', async () => {
    vi.mocked(cancelInvitation).mockResolvedValue({ ...openInvitation, status: 'CANCELLED', cancelledAt: createdAt })
    vi.mocked(getInvitation).mockResolvedValue(openInvitation)
    const { user } = renderHost()
    await createDefaultInvitation(user)
    vi.mocked(getInvitation).mockResolvedValue({ ...openInvitation, status: 'CANCELLED', cancelledAt: createdAt })

    await user.click(screen.getByRole('button', { name: 'Cancel invitation' }))

    expect(await screen.findByText('Invitation cancelled.')).toBeInTheDocument()
    expect(cancelInvitation).toHaveBeenCalledWith(3)
    expect(screen.queryByRole('textbox', { name: 'Invitation link' })).not.toBeInTheDocument()
    expect(storedInvitation()).toBeNull()
  })

  it('opens the game when the opponent claimed the seat just before the cancel', async () => {
    vi.mocked(cancelInvitation).mockRejectedValue(new ApiError(409, 'INVITATION_ALREADY_CLAIMED'))
    const { user, onClaimed } = renderHost()
    await createDefaultInvitation(user)
    vi.mocked(getInvitation).mockResolvedValue(claimed)

    await user.click(screen.getByRole('button', { name: 'Cancel invitation' }))

    await waitFor(() => expect(onClaimed).toHaveBeenCalledWith(42))
  })

  it('shows the expiry when the invitation expired just before the cancel', async () => {
    vi.mocked(cancelInvitation).mockRejectedValue(new ApiError(410, 'INVITATION_EXPIRED'))
    const { user } = renderHost()
    await createDefaultInvitation(user)
    vi.mocked(getInvitation).mockResolvedValue({ ...openInvitation, status: 'EXPIRED' })

    await user.click(screen.getByRole('button', { name: 'Cancel invitation' }))

    expect(await screen.findByText('This invitation has expired.')).toBeInTheDocument()
  })

  it('starts over from a cancelled invitation', async () => {
    vi.mocked(cancelInvitation).mockResolvedValue({ ...openInvitation, status: 'CANCELLED' })
    const { user } = renderHost()
    await createDefaultInvitation(user)
    vi.mocked(getInvitation).mockResolvedValue({ ...openInvitation, status: 'CANCELLED' })
    await user.click(screen.getByRole('button', { name: 'Cancel invitation' }))

    await user.click(await screen.findByRole('button', { name: 'Create a new invitation' }))

    expect(await screen.findByRole('button', { name: 'Create invitation' })).toBeInTheDocument()
  })
})

describe('polling the invitation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(createdAt))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function advance(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  }

  async function renderWaiting() {
    const rendered = renderHost(userEvent.setup({ advanceTimers: vi.advanceTimersByTime }))
    await createDefaultInvitation(rendered.user)
    return rendered
  }

  it('counts down to the 15-minute expiry', async () => {
    await renderWaiting()

    expect(screen.getByText(/Expires in 15:00/)).toBeInTheDocument()

    await advance(60_000)

    expect(screen.getByText(/Expires in 14:00/)).toBeInTheDocument()
  })

  it('opens the game once the opponent claims the seat', async () => {
    const { onClaimed } = await renderWaiting()
    expect(onClaimed).not.toHaveBeenCalled()

    vi.mocked(getInvitation).mockResolvedValue(claimed)
    await advance(5_000)

    expect(onClaimed).toHaveBeenCalledWith(42)
    expect(storedInvitation()).toBeNull()
  })

  it('shows the expiry once the server reports the invitation expired', async () => {
    await renderWaiting()

    vi.mocked(getInvitation).mockResolvedValue({ ...openInvitation, status: 'EXPIRED' })
    await advance(5_000)

    expect(screen.getByText('This invitation has expired.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Invitation link' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create a new invitation' })).toBeInTheDocument()
  })

  it('stops polling once the invitation is no longer open', async () => {
    await renderWaiting()
    vi.mocked(getInvitation).mockResolvedValue({ ...openInvitation, status: 'EXPIRED' })
    await advance(5_000)
    const calls = vi.mocked(getInvitation).mock.calls.length

    await advance(30_000)

    expect(vi.mocked(getInvitation).mock.calls.length).toBe(calls)
  })
})
