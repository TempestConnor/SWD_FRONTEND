import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelInvitation } from '../api'
import { invitationKeys } from '../queryKeys'

/**
 * A cancel can lose a race with a claim or with expiry; either way the invitation's current status
 * is re-read, so the host sees what actually happened.
 */
export function useCancelInvitationMutation(invitationId: number) {
  const queryClient = useQueryClient()
  const queryKey = invitationKeys.detail(invitationId)

  return useMutation({
    mutationFn: () => cancelInvitation(invitationId),
    onSuccess: (invitation) => queryClient.setQueryData(queryKey, invitation),
    onError: () => queryClient.invalidateQueries({ queryKey }),
  })
}
