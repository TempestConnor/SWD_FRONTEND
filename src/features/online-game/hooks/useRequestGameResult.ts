import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { onlineGameKeys } from '../queryKeys'

/**
 * Sends a heartbeat now instead of at the next poll. A due timeout is recorded by the heartbeat, not by
 * `GET /api/online-games/{id}`, so this is how the viewer learns of it at once (F09).
 */
export function useRequestGameResult(gameId: number) {
  const queryClient = useQueryClient()

  return useCallback(
    () => void queryClient.refetchQueries({ queryKey: onlineGameKeys.heartbeat(gameId), exact: true }),
    [queryClient, gameId],
  )
}
