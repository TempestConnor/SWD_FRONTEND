import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getOnlineGame, type OnlineGame } from '../api'
import { onlineGameKeys } from '../queryKeys'

export function useOnlineGameQuery(gameId: number, enabled: boolean) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: onlineGameKeys.detail(gameId),
    queryFn: async () => {
      const game = await getOnlineGame(gameId)
      // The read is passive and may still show a game active that a heartbeat has already seen end.
      const cached = queryClient.getQueryData<OnlineGame>(onlineGameKeys.detail(gameId))
      return isFinished(cached) && !isFinished(game) ? cached : game
    },
    enabled,
  })
}

/** A finished game never becomes pending or active again. */
export function isFinished(game: OnlineGame | undefined): game is OnlineGame {
  return game?.status === 'COMPLETED' || game?.status === 'CANCELLED'
}
