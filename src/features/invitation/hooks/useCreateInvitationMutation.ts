import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createInvitation, type CreateInvitationRequest } from '../api'
import { invitationKeys } from '../queryKeys'

/** Seeds the invitation query with the answer, so the waiting view shows it without another request. */
export function useCreateInvitationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateInvitationRequest) => createInvitation(body),
    onSuccess: ({ invitation }) => {
      if (invitation?.id !== undefined) {
        queryClient.setQueryData(invitationKeys.detail(invitation.id), invitation)
      }
    },
  })
}
