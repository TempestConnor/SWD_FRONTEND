import type { components } from './schema'

type AuthToken = components['schemas']['AuthTokenDTO']
type Account = components['schemas']['AccountDTO']

export type Session = { accessToken: string; expiresAt: string; account: Account }

const STORAGE_KEY = 'chess.session.v1'

const listeners = new Set<() => void>()

/** The stored session, or null when signed out, expired, or unreadable. */
export function getSession(now: Date = new Date()): Session | null {
  const session = readStored()

  if (session && Date.parse(session.expiresAt) <= now.getTime()) {
    clearSession()
    return null
  }

  return session
}

let snapshotRaw: string | null = null
let snapshot: Session | null = null

/**
 * For useSyncExternalStore: the same object until the stored value changes, and no side effects,
 * so it is safe to call during render. An expired session reads as null; getSession() removes it.
 */
export function getSessionSnapshot(now: Date = new Date()): Session | null {
  const raw = readRaw()
  if (raw !== snapshotRaw) {
    snapshotRaw = raw
    snapshot = parse(raw)
  }

  return snapshot && Date.parse(snapshot.expiresAt) > now.getTime() ? snapshot : null
}

export function saveSession(token: AuthToken): Session {
  if (!token.accessToken || !token.expiresAt || !token.account) {
    throw new Error('Sign-in response is missing accessToken, expiresAt, or account')
  }

  const session: Session = { accessToken: token.accessToken, expiresAt: token.expiresAt, account: token.account }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Storage unavailable (private window, quota); the session lasts only until reload.
  }
  notify()
  return session
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored if storage is unavailable.
  }
  notify()
}

/** For useSyncExternalStore: called whenever the session is saved or cleared. */
export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify() {
  listeners.forEach((listener) => listener())
}

function readStored(): Session | null {
  return parse(readRaw())
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function parse(raw: string | null): Session | null {
  if (!raw) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    return isSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.accessToken === 'string' &&
    typeof candidate.expiresAt === 'string' &&
    !Number.isNaN(Date.parse(candidate.expiresAt)) &&
    typeof candidate.account === 'object' &&
    candidate.account !== null
  )
}
