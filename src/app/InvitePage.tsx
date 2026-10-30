import { useNavigate } from 'react-router'
import { InvitationHost } from '../features/invitation/components/InvitationHost'
import { RequireSession } from './RequireSession'

export function InvitePage() {
  const navigate = useNavigate()

  return (
    <RequireSession>
      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-10">
        <InvitationHost onClaimed={(gameId) => navigate(`/games/${gameId}`, { replace: true })} />
      </main>
    </RequireSession>
  )
}
