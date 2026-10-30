import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { ReturnState } from './returnPath'
import { useSession } from './SessionContext'

type RequireSessionProps = { children: ReactNode }

/** Renders its children for a signed-in player; sends a guest to sign in and back here afterwards. */
export function RequireSession({ children }: RequireSessionProps) {
  const { session } = useSession().state
  const location = useLocation()

  if (!session) {
    const state: ReturnState = { from: location.pathname + location.search }
    return <Navigate to="/signin" replace state={state} />
  }

  return children
}
