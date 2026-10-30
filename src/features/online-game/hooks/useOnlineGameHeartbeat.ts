import { useQuery, useQueryClient } from '@tanstack/react-query'
import { heartbeatOnlineGame } from '../api'
import { onlineGameKeys } from '../queryKeys'

/**
 * The server cancels a pending game after 30 s without contact (BR-INV-013/015); pinging well inside that
 * also lets the viewer see the opponent's Ready and the start quickly, as there is no push.
 */
const HEARTBEAT_INTERVAL_MS = 5_000

/** Pings while the game is pending or active and writes each answer into the game query. */
export function useOnlineGameHeartbeat(gameId: number, enabled: boolean) {
  const queryClient = useQueryClient()

  useQuery({
    queryKey: onlineGameKeys.heartbeat(gameId),
    queryFn: async ({ signal }) => {
      const game = await heartbeatOnlineGame(gameId)
      // A Ready or Cancel cancels this query; its answer is then older than theirs and must not win.
      if (!signal.aborted) {
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
}
