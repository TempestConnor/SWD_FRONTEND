import { useParams } from 'react-router'
import { OnlineGame } from '../features/online-game/components/OnlineGame'
import { GameRatingNote } from './GameRatingNote'
import { RequireSession } from './RequireSession'

export function OnlineGamePage() {
  const { gameId } = useParams()

  return (
    <RequireSession>
      <main className="mx-auto max-w-xl p-6">
        <OnlineGame gameId={Number(gameId)} />
        <GameRatingNote gameId={Number(gameId)} />
      </main>
    </RequireSession>
  )
}
