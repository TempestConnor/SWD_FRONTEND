import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveSession } from '../../../api/session'
import { authKeys, signUp, type Account, type SignUpRequest } from '../api'

/** Registers, stores the returned session, and resolves with the new account. */
export function useSignUpMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: SignUpRequest): Promise<Account> => saveSession(await signUp(body)).account,
    onSuccess: (account) => {
      queryClient.setQueryData(authKeys.me, account)
    },
  })
}
