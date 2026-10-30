import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { OnlineGame } from '../api'
import { onlineGameKeys } from '../queryKeys'

/**
 * A Ready, Cancel, move, resignation or abandonment vote answers with the game. An in-flight heartbeat is dropped so its older answer cannot
 * overwrite this one; on failure the game is re-read, e.g. a cancel that lost the race with the start.
 */
export function useGameActionMutation<TVariables = void>(
  gameId: number,
  action: (variables: TVariables) => Promise<OnlineGame>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: action,
    onMutate: () => queryClient.cancelQueries({ queryKey: onlineGameKeys.heartbeat(gameId) }),
    onSuccess: (game) => queryClient.setQueryData(onlineGameKeys.detail(gameId), game),
    // Not awaited: the caller's onError (the message, asking for a due result) must not wait for the re-read.
    onError: () => void queryClient.invalidateQueries({ queryKey: onlineGameKeys.detail(gameId), exact: true }),
  })
}
