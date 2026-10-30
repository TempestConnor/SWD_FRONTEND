import { useNavigate } from 'react-router'
import { Matchmaking } from '../features/matchmaking/components/Matchmaking'
import { RequireSession } from './RequireSession'

export function PlayOnlinePage() {
  const navigate = useNavigate()

  return (
    <RequireSession>
      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-10">
        <Matchmaking onMatched={(gameId) => navigate(`/games/${gameId}`, { replace: true })} />
      </main>
    </RequireSession>
  )
}
