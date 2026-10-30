import { createContext, use } from 'react'
import type { Session } from '../api/session'

/** Only the signed-in session and signing out; account data lives in the query cache. */
export type SessionContextValue = {
  state: { session: Session | null }
  actions: { signOut: () => void }
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const context = use(SessionContext)
  if (!context) {
    throw new Error('useSession must be used inside SessionProvider')
  }
  return context
}
