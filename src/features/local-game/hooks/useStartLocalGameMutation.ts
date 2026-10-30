import { useMutation, useQueryClient } from '@tanstack/react-query'
import { startLocalGame, type StartLocalGameRequest } from '../api'
import { localGameKeys } from './useLocalPositionQuery'

/** Starts a game and caches its initial position, so the board renders without another request. */
export function useStartLocalGameMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: StartLocalGameRequest) => startLocalGame(body),
    onSuccess: (game) => {
      queryClient.setQueryData(localGameKeys.position([]), game.position)
    },
  })
}
