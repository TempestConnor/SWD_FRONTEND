import { useNavigate } from 'react-router'
import { Matchmaking } from '../features/matchmaking/components/Matchmaking'
import { RequireSession } from './RequireSession'

export function PlayOnlinePage() {
  const navigate = useNavigate()

  return (
    <RequireSession>
      <main className="mx-auto max-w-xl p-6">
        <Matchmaking onMatched={(gameId) => navigate(`/games/${gameId}`, { replace: true })} />
      </main>
    </RequireSession>
  )
}
