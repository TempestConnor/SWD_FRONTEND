import { useMutation, useQueryClient } from '@tanstack/react-query'
import { joinQueue } from '../api'
import { matchmakingKeys } from '../queryKeys'

/** Classical standard is the only queue at launch, with its fixed 30+10 clock (BR-MOVE-013/014). */
const QUEUE = { mode: 'CLASSICAL', variant: 'STANDARD' }

export function useJoinQueueMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    // A heartbeat in flight answers for the state before the join and must not overwrite it.
    onMutate: () => queryClient.cancelQueries({ queryKey: matchmakingKeys.request }),
    mutationFn: () => joinQueue(QUEUE),
    onSuccess: (request) => queryClient.setQueryData(matchmakingKeys.request, request),
  })
}
