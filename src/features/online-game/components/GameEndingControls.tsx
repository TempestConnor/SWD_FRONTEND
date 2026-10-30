import { errorMessages } from '../../../api/errorMessages'
import { ApiError } from '../../../api/errors'
import { toSide } from '../../../shared/lib/chess'
import { Button } from '../../../shared/ui/Button'
import type { OnlineGame } from '../api'
import { useAbandonVoteMutation } from '../hooks/useAbandonVoteMutation'
import { useResignMutation } from '../hooks/useResignMutation'
import { onlineGameMessages as messages } from '../messages'

type GameEndingControlsProps = {
  game: OnlineGame
}

/**
 * Player-driven endings of an active game (F10): resigning loses at once, and abandoning needs both players'
 * votes. A vote cannot be withdrawn (decided 2026-10-19), so every action is confirmed first. The opponent's
 * proposal and ending arrive through the heartbeat.
 */
export function GameEndingControls({ game }: GameEndingControlsProps) {
  const gameId = game.id ?? 0
  const resign = useResignMutation(gameId)
  const vote = useAbandonVoteMutation(gameId)
  const failure = resign.error ?? vote.error
  const alert = failure ? (
    <p role="alert" className="text-red-700">
      {rejectionMessage(failure)}
    </p>
  ) : null

  // A late action's refusal stays visible next to the ending the re-read game shows.
  if (game.status !== 'ACTIVE') {
    return alert
  }

  const viewerIsWhite = toSide(game.viewerColor) === 'WHITE'
  const viewer = viewerIsWhite ? game.white : game.black
  const opponent = viewerIsWhite ? game.black : game.white
  const busy = resign.isPending || vote.isPending

  function act(confirmText: string, mutate: () => void) {
    if (window.confirm(confirmText)) {
      // Only the latest attempt's error is shown.
      resign.reset()
      vote.reset()
      mutate()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {viewer?.abandonVoted ? <p>{messages.viewerProposedAbandon}</p> : null}
      {!viewer?.abandonVoted && opponent?.abandonVoted ? (
        <p className="font-medium">{messages.opponentProposedAbandon(opponent.displayName ?? '')}</p>
      ) : null}
      {alert}
      <div className="flex gap-2">
        <Button disabled={busy} onClick={() => act(messages.confirmResign, () => resign.mutate())}>
          {messages.resign}
        </Button>
        {viewer?.abandonVoted ? null : opponent?.abandonVoted ? (
          <Button
            className="bg-white text-gray-900 ring-1 ring-gray-300 hover:bg-gray-100"
            disabled={busy}
            onClick={() => act(messages.confirmAgreeAbandon, () => vote.mutate())}
          >
            {messages.agreeAbandon}
          </Button>
        ) : (
          <Button
            className="bg-white text-gray-900 ring-1 ring-gray-300 hover:bg-gray-100"
            disabled={busy}
            onClick={() => act(messages.confirmProposeAbandon, () => vote.mutate())}
          >
            {messages.proposeAbandon}
          </Button>
        )}
      </div>
    </div>
  )
}

function rejectionMessage(failure: Error): string {
  const known = failure instanceof ApiError ? messages.endingRejected[failure.errorCode] : undefined
  return known ?? errorMessages.generic
}
