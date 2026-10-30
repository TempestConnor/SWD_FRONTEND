import { useNavigate } from 'react-router'
import { InvitationHost } from '../features/invitation/components/InvitationHost'
import { RequireSession } from './RequireSession'

export function InvitePage() {
  const navigate = useNavigate()

  return (
    <RequireSession>
      <main className="mx-auto max-w-xl p-6">
        <InvitationHost onClaimed={(gameId) => navigate(`/games/${gameId}`, { replace: true })} />
      </main>
    </RequireSession>
  )
}
