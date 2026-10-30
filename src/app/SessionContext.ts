import { createContext } from 'react'
import type { Session } from '../api/session'

/** Only the signed-in session and signing out; account data lives in the query cache. */
export type SessionContextValue = {
  state: { session: Session | null }
  actions: { signOut: () => void }
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  throw new Error('not implemented')
}
