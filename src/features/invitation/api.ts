import { api } from '../../api/client'
import { unwrap } from '../../api/errors'
import type { components } from '../../api/schema'

export type CreateInvitationRequest = components['schemas']['CreateInvitationDTO']
export type CreatedInvitation = components['schemas']['CreatedInvitationDTO']
export type Invitation = components['schemas']['InvitationDTO']
export type ClaimedGame = components['schemas']['OnlineGameDTO']

/** The token in the answer is the only copy: the backend stores just its hash. */
export async function createInvitation(body: CreateInvitationRequest): Promise<CreatedInvitation> {
  return unwrap(await api.POST('/api/invitations', { body }))
}

/** Host-only; the status (OPEN, CLAIMED, EXPIRED, CANCELLED) is derived by the backend at read time. */
export async function getInvitation(invitationId: number): Promise<Invitation> {
  return unwrap(await api.GET('/api/invitations/{invitationId}', { params: { path: { invitationId } } }))
}

export async function cancelInvitation(invitationId: number): Promise<Invitation> {
  return unwrap(await api.POST('/api/invitations/{invitationId}/cancel', { params: { path: { invitationId } } }))
}

/** Atomic on the backend; a retry by the same joiner returns the same pending game. */
export async function claimInvitation(token: string): Promise<ClaimedGame> {
  return unwrap(await api.POST('/api/invitations/claim', { body: { token } }))
}
