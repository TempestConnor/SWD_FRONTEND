import { errorMessages } from '../../../api/errorMessages'
import { ApiError } from '../../../api/errors'
import { toSide } from '../../../shared/lib/chess'
import { Button } from '../../../shared/ui/Button'
import { GameTerms } from '../../../shared/ui/GameTerms'
import { useOnlineGameHeartbeat } from '../hooks/useOnlineGameHeartbeat'
import { useOnlineGameQuery } from '../hooks/useOnlineGameQuery'
import { onlineGameMessages as messages } from '../messages'
import { GameEndingControls } from './GameEndingControls'
import { OnlinePlay } from './OnlinePlay'
import { ReadyCheck } from './ReadyCheck'

type OnlineGameProps = {
  gameId: number
}

/**
 * The board both participants see once an invitation is claimed (BR-INV-008), with the Ready check before
 * the start (F07), the moves once it is active (F08), the player-driven endings (F10) and the connection
 * state of both players (F11).
 */
export function OnlineGame({ gameId }: OnlineGameProps) {
  const validId = Number.isSafeInteger(gameId) && gameId > 0
  const query = useOnlineGameQuery(gameId, validId)
  const notFound =
    !validId || (query.error instanceof ApiError && query.error.errorCode === 'ONLINE_GAME_NOT_FOUND')
  const game = query.data
  const heartbeat = useOnlineGameHeartbeat(
    gameId,
    validId && (game?.status === 'PENDING' || game?.status === 'ACTIVE'),
  )

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
          {/* Missing pings for three minutes forfeits a started game (BR-GAME-015/016). */}
          {heartbeat.failing && game.status === 'ACTIVE' ? (
            <p role="alert" className="text-red-700">
              {messages.connectionLost}
            </p>
          ) : null}
          <ReadyCheck game={game} />
          <OnlinePlay game={game} />
          <GameEndingControls game={game} />
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
