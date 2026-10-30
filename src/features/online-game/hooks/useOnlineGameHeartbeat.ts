import { useQuery, useQueryClient } from '@tanstack/react-query'
import { heartbeatOnlineGame, type OnlineGame } from '../api'
import { onlineGameKeys } from '../queryKeys'
import { isFinished } from './useOnlineGameQuery'

/**
 * The server cancels a pending game after 30 s without contact (BR-INV-013/015); pinging well inside that
 * also lets the viewer see the opponent's Ready and the start quickly, as there is no push.
 */
const HEARTBEAT_INTERVAL_MS = 5_000

/**
 * Pings while the game is pending or active and writes each answer into the game query. Pings go on after a
 * failure, so the viewer reconnects by itself; `failing` is true until one gets through again.
 */
export function useOnlineGameHeartbeat(gameId: number, enabled: boolean) {
  const queryClient = useQueryClient()

  const { isError } = useQuery({
    queryKey: onlineGameKeys.heartbeat(gameId),
    queryFn: async ({ signal }) => {
      const game = await heartbeatOnlineGame(gameId)
      // A Ready, Cancel or move cancels this query; its answer is then older than theirs and must not win.
      // A ping sent just before a move was accepted can still answer after it, so fewer plies never win either,
      // and nor does a running game over one already seen to end.
      const cached = queryClient.getQueryData<OnlineGame>(onlineGameKeys.detail(gameId))
      const older = (game.lastPly ?? 0) < (cached?.lastPly ?? 0) || (isFinished(cached) && !isFinished(game))
      if (!signal.aborted && !older) {
        queryClient.setQueryData(onlineGameKeys.detail(gameId), game)
      }
      return game
    },
    enabled,
    retry: false,
    refetchInterval: HEARTBEAT_INTERVAL_MS,
    // A hidden tab must keep pinging, or the server would take it for a closed one.
    refetchIntervalInBackground: true,
  })
  return { failing: isError }
}
