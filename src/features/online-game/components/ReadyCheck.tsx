import { errorMessages } from '../../../api/errorMessages'
import { ApiError } from '../../../api/errors'
import { toSide } from '../../../shared/lib/chess'
import { Button } from '../../../shared/ui/Button'
import { Countdown } from '../../../shared/ui/Countdown'
import type { OnlineGame } from '../api'
import { useCancelGameMutation } from '../hooks/useCancelGameMutation'
import { useReadyMutation } from '../hooks/useReadyMutation'
import { onlineGameMessages as messages } from '../messages'

type ReadyCheckProps = {
  game: OnlineGame
}

/**
 * The game's lifecycle before play (F07): both players press Ready within three minutes of the claim or
 * pairing, or either cancels. The server decides the start and every cancellation; this shows its answers.
 */
export function ReadyCheck({ game }: ReadyCheckProps) {
  const gameId = game.id ?? 0
  const ready = useReadyMutation(gameId)
  const cancel = useCancelGameMutation(gameId)
  const pending = game.status === 'PENDING'
  const viewer = toSide(game.viewerColor) === 'WHITE' ? game.white : game.black
  const lostStartRace = cancel.error instanceof ApiError && cancel.error.errorCode === 'ONLINE_GAME_ALREADY_STARTED'
  const failed = ready.isError || (cancel.isError && !lostStartRace)
  const statusText = game.status ? messages.status[game.status] : undefined

  return (
    <div className="flex flex-col gap-2">
      {statusText ? <p>{statusText}</p> : null}
      {lostStartRace ? <p role="status">{messages.alreadyStarted}</p> : null}
      {pending ? (
        <>
          <ul className="flex flex-col gap-1 text-sm">
            {[game.white, game.black].map((player) => (
              <li key={player?.accountId}>
                {player?.ready
                  ? messages.playerReady(player.displayName ?? '')
                  : messages.playerNotReady(player?.displayName ?? '')}
              </li>
            ))}
          </ul>
          <Countdown until={game.readyDeadlineAt} label={messages.readyCountdown} />
          {viewer?.ready ? <p className="font-medium">{messages.viewerReady}</p> : null}
        </>
      ) : null}
      {failed ? (
        <p role="alert" className="text-red-700">
          {errorMessages.generic}
        </p>
      ) : null}
      {pending ? (
        <div className="flex gap-2">
          {viewer?.ready ? null : (
            <Button onClick={() => ready.mutate()} disabled={ready.isPending || cancel.isPending}>
              {messages.ready}
            </Button>
          )}
          <Button
            className="bg-white text-gray-900 ring-1 ring-gray-300 hover:bg-gray-100"
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
          >
            {messages.cancel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
