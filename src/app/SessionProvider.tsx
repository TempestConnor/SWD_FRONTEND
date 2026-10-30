import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { clearSession, getSessionSnapshot, subscribeToSession } from '../api/session'
import { SessionContext, type SessionContextValue } from './SessionContext'

type SessionProviderProps = { children: ReactNode }

export function SessionProvider({ children }: SessionProviderProps) {
  const queryClient = useQueryClient()
  const session = useSyncExternalStore(subscribeToSession, getSessionSnapshot)

  const value = useMemo<SessionContextValue>(
    () => ({
      state: { session },
      actions: {
        signOut() {
          clearSession()
          // Cached server data belongs to the account that just signed out.
          queryClient.removeQueries()
        },
      },
    }),
    [session, queryClient],
  )

  return <SessionContext value={value}>{children}</SessionContext>
}
