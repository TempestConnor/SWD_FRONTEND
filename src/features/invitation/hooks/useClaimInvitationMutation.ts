import { useMutation } from '@tanstack/react-query'
import { claimInvitation } from '../api'

export function useClaimInvitationMutation() {
  return useMutation({ mutationFn: (token: string) => claimInvitation(token) })
}
