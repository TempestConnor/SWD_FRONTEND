import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import {
  cancelInvitation,
  claimInvitation,
  createInvitation,
  getInvitation,
  type ClaimedGame,
  type CreatedInvitation,
  type Invitation,
} from './api'

vi.mock('../../api/client', () => ({ api: { GET: vi.fn(), POST: vi.fn() } }))

const invitation: Invitation = {
  id: 3,
  status: 'OPEN',
  hostColor: 'RANDOM',
  rated: true,
  mode: 'CLASSICAL',
  variant: 'STANDARD',
  clock: { enabled: true, initialMinutes: 30, incrementSeconds: 10 },
  createdAt: '2026-10-31T10:00:00Z',
  expiresAt: '2026-10-31T10:15:00Z',
}
const created: CreatedInvitation = { token: 'tok_abc', invitation }
const game: ClaimedGame = { id: 42, source: 'INVITE', status: 'PENDING', viewerColor: 'BLACK' }

function ok(data: unknown, status = 200) {
  return { data, response: new Response(null, { status }) } as never
}

function problem(status: number, body: unknown) {
  return { error: body, response: new Response(null, { status }) } as never
}

afterEach(() => {
  vi.resetAllMocks()
})

describe('invitation api', () => {
  it('creates an invitation through POST /api/invitations', async () => {
    vi.mocked(api.POST).mockResolvedValue(ok(created, 201))
    const body = { hostColor: 'WHITE', clockEnabled: true, initialMinutes: 30, incrementSeconds: 10 }

    await expect(createInvitation(body)).resolves.toEqual(created)
    expect(api.POST).toHaveBeenCalledWith('/api/invitations', { body })
  })

  it('reads the invitation status through GET /api/invitations/{invitationId}', async () => {
    vi.mocked(api.GET).mockResolvedValue(ok(invitation))

    await expect(getInvitation(3)).resolves.toEqual(invitation)
    expect(api.GET).toHaveBeenCalledWith('/api/invitations/{invitationId}', { params: { path: { invitationId: 3 } } })
  })

  it('cancels through POST /api/invitations/{invitationId}/cancel', async () => {
    vi.mocked(api.POST).mockResolvedValue(ok({ ...invitation, status: 'CANCELLED' }))

    await expect(cancelInvitation(3)).resolves.toMatchObject({ status: 'CANCELLED' })
    expect(api.POST).toHaveBeenCalledWith('/api/invitations/{invitationId}/cancel', {
      params: { path: { invitationId: 3 } },
    })
  })

  it('claims a seat with the link token through POST /api/invitations/claim', async () => {
    vi.mocked(api.POST).mockResolvedValue(ok(game))

    await expect(claimInvitation('tok_abc')).resolves.toEqual(game)
    expect(api.POST).toHaveBeenCalledWith('/api/invitations/claim', { body: { token: 'tok_abc' } })
  })

  it.each([
    [410, 'INVITATION_EXPIRED'],
    [410, 'INVITATION_CANCELLED'],
    [409, 'INVITATION_FULL'],
    [409, 'CANNOT_JOIN_OWN_INVITATION'],
    [404, 'INVITATION_NOT_FOUND'],
  ])('throws an ApiError carrying %i %s when a claim is refused', async (status, errorCode) => {
    vi.mocked(api.POST).mockResolvedValue(problem(status, { status, errorCode }))

    await expect(claimInvitation('tok_abc')).rejects.toMatchObject({ name: 'ApiError', status, errorCode })
  })
})
