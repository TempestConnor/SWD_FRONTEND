import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { authKeys } from '../features/auth/api'
import { useCurrentAccountQuery } from '../features/auth/hooks/useCurrentAccountQuery'
import { useOnlineGameQuery } from '../features/online-game/hooks/useOnlineGameQuery'
import { appMessages } from './messages'

const messages = appMessages.gameRating

type GameRatingNoteProps = {
  gameId: number
}

/**
 * What a finished online game did to the viewer's rating (F12). The server applies Elo in the same step that
 * completes a rated game but leaves ratings out of game responses, so the account is re-read once it ends.
 */
export function GameRatingNote({ gameId }: GameRatingNoteProps) {
  const queryClient = useQueryClient()
  const game = useOnlineGameQuery(gameId, Number.isSafeInteger(gameId) && gameId > 0).data
  const account = useCurrentAccountQuery(true)
  const completed = game?.status === 'COMPLETED'
  const ratedEnd = completed && game.rated === true

  // The end may come from a heartbeat as well as the viewer's own action, so this follows the game, not an event.
  useEffect(() => {
    if (ratedEnd) {
      void queryClient.invalidateQueries({ queryKey: authKeys.me, exact: true })
    }
  }, [queryClient, ratedEnd, gameId])

  if (!completed) {
    return null
  }
  // Unrated games create no rating events (BR-RATE-007).
  if (!ratedEnd) {
    return <p>{messages.unrated}</p>
  }
  const mode = game.mode ?? 'CLASSICAL'
  const rating = account.data?.ratings?.find((entry) => entry.mode === mode)?.rating
  if (account.isFetching || rating === undefined) {
    return null
  }
  const modeName = messages.modes[mode] ?? mode
  // Every draw is +0 for both players (BR-RATE-009).
  return <p>{game.outcome === 'DRAW' ? messages.draw(modeName, rating) : messages.rated(modeName, rating)}</p>
}
