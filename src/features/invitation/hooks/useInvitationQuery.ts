import { useQuery } from '@tanstack/react-query'
import { getInvitation } from '../api'
import { invitationKeys } from '../queryKeys'

/** Polling is how the host learns of a claim; real-time notice is deferred on the backend. */
const POLL_INTERVAL_MS = 3_000

/** Polls while the invitation is open and stops once it is claimed, expired or cancelled. */
export function useInvitationQuery(invitationId: number | null) {
  return useQuery({
    queryKey: invitationKeys.detail(invitationId ?? 0),
    queryFn: () => getInvitation(invitationId ?? 0),
    enabled: invitationId !== null,
    // The answer to a create seeds this query; it is fresh until the first poll.
    staleTime: POLL_INTERVAL_MS,
    refetchInterval: (query) => (query.state.data?.status === 'OPEN' ? POLL_INTERVAL_MS : false),
  })
}
