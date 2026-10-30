import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../../api/errors'
import { cancelQueue } from '../api'
import { matchmakingKeys } from '../queryKeys'

/**
 * Leaving answers with the request as it now stands; a cancel that lost a race (timed out first) shows that
 * instead. An unknown request means there is nothing to leave. Any other failure re-reads the request.
 */
export function useCancelQueueMutation() {
  const queryClient = useQueryClient()
  const queryKey = matchmakingKeys.request

  return useMutation({
    onMutate: () => queryClient.cancelQueries({ queryKey }),
    mutationFn: () => cancelQueue(),
    onSuccess: (request) => queryClient.setQueryData(queryKey, request),
    onError: (error) => {
      if (error instanceof ApiError && error.errorCode === 'QUEUE_REQUEST_NOT_FOUND') {
        queryClient.setQueryData(queryKey, null)
      } else {
        void queryClient.invalidateQueries({ queryKey })
      }
    },
  })
}
