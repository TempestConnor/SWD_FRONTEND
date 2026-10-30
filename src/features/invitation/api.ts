import type { components } from '../../api/schema'

export type CreateInvitationRequest = components['schemas']['CreateInvitationDTO']
export type CreatedInvitation = components['schemas']['CreatedInvitationDTO']
export type Invitation = components['schemas']['InvitationDTO']
export type ClaimedGame = components['schemas']['OnlineGameDTO']

export async function createInvitation(_body: CreateInvitationRequest): Promise<CreatedInvitation> {
  throw new Error('not implemented')
}

export async function getInvitation(_invitationId: number): Promise<Invitation> {
  throw new Error('not implemented')
}

export async function cancelInvitation(_invitationId: number): Promise<Invitation> {
  throw new Error('not implemented')
}

export async function claimInvitation(_token: string): Promise<ClaimedGame> {
  throw new Error('not implemented')
}
