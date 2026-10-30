import { useParams } from 'react-router'
import { HistoryGameDetail } from '../features/match-history/components/HistoryGameDetail'
import { RequireSession } from './RequireSession'

export function HistoryGamePage() {
  const { gameId } = useParams()

  return (
    <RequireSession>
      <main className="mx-auto max-w-xl p-6">
        <HistoryGameDetail gameId={Number(gameId)} />
      </main>
    </RequireSession>
  )
}
