import { useParams } from 'react-router'
import { OnlineGame } from '../features/online-game/components/OnlineGame'
import { GameRatingNote } from './GameRatingNote'
import { RequireSession } from './RequireSession'

export function OnlineGamePage() {
  const { gameId } = useParams()

  return (
    <RequireSession>
      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-10">
        <OnlineGame gameId={Number(gameId)} />
        <GameRatingNote gameId={Number(gameId)} />
      </main>
    </RequireSession>
  )
}
