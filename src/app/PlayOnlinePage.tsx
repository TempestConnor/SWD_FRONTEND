import { Matchmaking } from '../features/matchmaking/components/Matchmaking'
import { RequireSession } from './RequireSession'

export function PlayOnlinePage() {
  return (
    <RequireSession>
      <main className="mx-auto max-w-xl p-6">
        <Matchmaking />
      </main>
    </RequireSession>
  )
}
