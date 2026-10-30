import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../../api/errors'
import { heartbeatQueue, type QueueRequest } from '../api'
import { matchmakingKeys } from '../queryKeys'

/** The backend's agreed heartbeat, used if an answer does not carry its own interval. */
const DEFAULT_HEARTBEAT_SECONDS = 10
/** Pings a little ahead of the server's interval, so request latency never makes one late. */
const HEARTBEAT_LEAD = 0.9

/**
 * The player's queue request, read and kept alive by the heartbeat: there is no other way to read it.
 * The first answer tells a fresh page whether a search is still open (after a refresh or from another tab);
 * then it pings at the server's interval while queued, and goes on after a failure so the place is kept
 * once the connection is back.
 */
export function useQueueRequestQuery() {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: matchmakingKeys.request,
    queryFn: async (): Promise<QueueRequest | null> => {
      const previous = queryClient.getQueryData<QueueRequest | null>(matchmakingKeys.request)
      let request: QueueRequest
      try {
        request = await heartbeatQueue()
      } catch (error) {
        if (error instanceof ApiError && error.errorCode === 'QUEUE_REQUEST_NOT_FOUND') {
          return null
        }
        throw error
      }
      // A request that closed before this page saw it open is history, not news.
      return request.status === 'QUEUED' || previous?.status === 'QUEUED' ? request : null
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const request = query.state.data
      return request?.status === 'QUEUED'
        ? (request.heartbeatIntervalSeconds ?? DEFAULT_HEARTBEAT_SECONDS) * 1000 * HEARTBEAT_LEAD
        : false
    },
    // A hidden tab must keep pinging, or the server would drop the request as disconnected.
    refetchIntervalInBackground: true,
  })
}
