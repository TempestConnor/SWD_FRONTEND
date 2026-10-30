import { useParams } from 'react-router'
import { HistoryGameDetail } from '../features/match-history/components/HistoryGameDetail'
import { RequireSession } from './RequireSession'

export function HistoryGamePage() {
  const { gameId } = useParams()

  return (
    <RequireSession>
      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-10">
        <HistoryGameDetail gameId={Number(gameId)} />
      </main>
    </RequireSession>
  )
}
