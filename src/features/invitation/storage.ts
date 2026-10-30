export const INVITATION_STORAGE_KEY = 'chess.invitation.v1'

/** The host's open invitation; the token is returned only once, so it is kept to show the link after a refresh. */
export type StoredInvitation = { id: number; token: string }

export function loadInvitation(): StoredInvitation | null {
  throw new Error('not implemented')
}

export function saveInvitation(_invitation: StoredInvitation): void {
  throw new Error('not implemented')
}

export function clearInvitation(): void {
  throw new Error('not implemented')
}
