import { errorMessages } from '../../../api/errorMessages'
import { ApiError } from '../../../api/errors'
import { toSide } from '../../../shared/lib/chess'
import { Board } from '../../../shared/ui/Board'
import { Button } from '../../../shared/ui/Button'
import { GameTerms } from '../../../shared/ui/GameTerms'
import { useOnlineGameHeartbeat } from '../hooks/useOnlineGameHeartbeat'
import { useOnlineGameQuery } from '../hooks/useOnlineGameQuery'
import { onlineGameMessages as messages } from '../messages'
import { ReadyCheck } from './ReadyCheck'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const noLegalMoves: string[] = []
const ignore = () => {}

type OnlineGameProps = {
  gameId: number
}

/**
 * The board both participants see once an invitation is claimed (BR-INV-008), with the Ready check before
 * the start (F07). Moves are not playable yet: they are F08.
 */
export function OnlineGame({ gameId }: OnlineGameProps) {
  const validId = Number.isSafeInteger(gameId) && gameId > 0
  const query = useOnlineGameQuery(gameId, validId)
  const notFound =
    !validId || (query.error instanceof ApiError && query.error.errorCode === 'ONLINE_GAME_NOT_FOUND')
  const game = query.data
  useOnlineGameHeartbeat(gameId, validId && (game?.status === 'PENDING' || game?.status === 'ACTIVE'))

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">{messages.title}</h1>
      {notFound ? (
        <p role="alert" className="text-red-700">
          {messages.notFound}
        </p>
      ) : game ? (
        <>
          <div className="flex flex-col gap-1">
            <p>{messages.player('WHITE', game.white?.displayName ?? '')}</p>
            <p>{messages.player('BLACK', game.black?.displayName ?? '')}</p>
            <p className="font-medium">{messages.viewerColor(toSide(game.viewerColor))}</p>
          </div>
          <GameTerms rated={game.rated ?? false} clock={game.clock} />
          <ReadyCheck game={game} />
          <Board
            fen={game.currentFen ?? START_FEN}
            movableSide={toSide(game.viewerColor)}
            orientation={toSide(game.viewerColor)}
            legalMoves={noLegalMoves}
            locked
            onMove={ignore}
            onIllegalMove={ignore}
          />
        </>
      ) : query.isError ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-red-700">
            {errorMessages.generic}
          </p>
          <Button onClick={() => void query.refetch()}>{messages.retry}</Button>
        </div>
      ) : (
        <p>{messages.loading}</p>
      )}
    </section>
  )
}
