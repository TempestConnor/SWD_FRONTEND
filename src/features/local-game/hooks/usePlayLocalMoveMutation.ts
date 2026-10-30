import { useMutation, useQueryClient } from '@tanstack/react-query'
import { localPositionQuery } from './useLocalPositionQuery'

/**
 * Asks the backend to replay the move list including the new move. The answer lands in the position
 * cache, so committing the move afterwards shows the new position without a second request.
 */
export function usePlayLocalMoveMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (moves: string[]) => queryClient.fetchQuery(localPositionQuery(moves)),
  })
}
