import { useNavigate, useParams } from 'react-router'
import { JoinInvitation } from '../features/invitation/components/JoinInvitation'
import { RequireSession } from './RequireSession'

export function JoinInvitePage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()

  return (
    <RequireSession>
      <main className="mx-auto max-w-xl p-6">
        <JoinInvitation token={token} onJoined={(gameId) => navigate(`/games/${gameId}`, { replace: true })} />
      </main>
    </RequireSession>
  )
}
