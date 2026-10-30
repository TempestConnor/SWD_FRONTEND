import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/errors'
import { renderWithClient } from '../../../test/utils'
import { claimInvitation, type ClaimedGame } from '../api'
import { JoinInvitation } from './JoinInvitation'

vi.mock('../api', () => ({
  createInvitation: vi.fn(),
  getInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
  claimInvitation: vi.fn(),
}))

const game: ClaimedGame = { id: 42, source: 'INVITE', status: 'PENDING', viewerColor: 'BLACK' }

function renderJoin(token = 'tok_abc') {
  const onJoined = vi.fn()
  return {
    user: userEvent.setup(),
    onJoined,
    ...renderWithClient(
      <MemoryRouter>
        <JoinInvitation token={token} onJoined={onJoined} />
      </MemoryRouter>,
    ),
  }
}

afterEach(() => {
  vi.resetAllMocks()
})

describe('joining an invitation', () => {
  it('asks before claiming the seat', async () => {
    renderJoin()

    expect(await screen.findByRole('heading', { name: 'Join a game' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Join game' })).toBeEnabled()
    expect(claimInvitation).not.toHaveBeenCalled()
  })

  it('claims the seat with the link token and opens the game', async () => {
    vi.mocked(claimInvitation).mockResolvedValue(game)
    const { user, onJoined } = renderJoin('tok_abc')

    await user.click(await screen.findByRole('button', { name: 'Join game' }))

    await waitFor(() => expect(onJoined).toHaveBeenCalledWith(42))
    expect(claimInvitation).toHaveBeenCalledWith('tok_abc')
  })

  it('claims only once when the button is pressed twice', async () => {
    let resolve: (value: ClaimedGame) => void = () => {}
    vi.mocked(claimInvitation).mockImplementation(() => new Promise((settle) => (resolve = settle)))
    const { user, onJoined } = renderJoin()

    const button = await screen.findByRole('button', { name: 'Join game' })
    await user.click(button)
    await user.click(button)
    resolve(game)

    await waitFor(() => expect(onJoined).toHaveBeenCalledWith(42))
    expect(claimInvitation).toHaveBeenCalledTimes(1)
  })

  it.each([
    [409, 'INVITATION_FULL', 'This game is already full.'],
    [410, 'INVITATION_EXPIRED', 'This invitation has expired.'],
    [410, 'INVITATION_CANCELLED', 'The host cancelled this invitation.'],
    [404, 'INVITATION_NOT_FOUND', 'This invitation link is not valid.'],
    [409, 'CANNOT_JOIN_OWN_INVITATION', 'You cannot join your own invitation.'],
  ])('explains a %i %s refusal and offers no retry', async (status, errorCode, message) => {
    vi.mocked(claimInvitation).mockRejectedValue(new ApiError(status, errorCode))
    const { user, onJoined } = renderJoin()

    await user.click(await screen.findByRole('button', { name: 'Join game' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByRole('button', { name: 'Join game' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
    expect(onJoined).not.toHaveBeenCalled()
  })

  it('shows a generic error and lets the player retry after an unexpected failure', async () => {
    vi.mocked(claimInvitation).mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR')).mockResolvedValueOnce(game)
    const { user, onJoined } = renderJoin()

    await user.click(await screen.findByRole('button', { name: 'Join game' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')

    await user.click(screen.getByRole('button', { name: 'Join game' }))

    await waitFor(() => expect(onJoined).toHaveBeenCalledWith(42))
  })
})
