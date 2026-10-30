export const INVITATION_STORAGE_KEY = 'chess.invitation.v1'

/** The host's open invitation; the token is returned only once, so it is kept to show the link after a refresh. */
export type StoredInvitation = { id: number; token: string }

/** Session storage: the invitation belongs to this tab and lives at most 15 minutes. */
export function loadInvitation(): StoredInvitation | null {
  let raw: string | null
  try {
    raw = sessionStorage.getItem(INVITATION_STORAGE_KEY)
  } catch {
    return null
  }
  if (raw === null) {
    return null
  }

  try {
    const value: unknown = JSON.parse(raw)
    if (isStoredInvitation(value)) {
      return value
    }
  } catch {
    // Falls through to discarding the corrupt value.
  }
  clearInvitation()
  return null
}

export function saveInvitation(invitation: StoredInvitation): void {
  try {
    sessionStorage.setItem(INVITATION_STORAGE_KEY, JSON.stringify(invitation))
  } catch {
    // Storage can be full or blocked; the invitation is then lost on refresh.
  }
}

export function clearInvitation(): void {
  try {
    sessionStorage.removeItem(INVITATION_STORAGE_KEY)
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

function isStoredInvitation(value: unknown): value is StoredInvitation {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'number' &&
    Number.isSafeInteger(candidate.id) &&
    typeof candidate.token === 'string' &&
    candidate.token !== ''
  )
}
