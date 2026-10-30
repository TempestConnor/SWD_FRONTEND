import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveSession } from '../../../api/session'
import { authKeys, signIn, type Account, type SignInRequest } from '../api'

/** Signs in, stores the returned session, and resolves with the account. */
export function useSignInMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: SignInRequest): Promise<Account> => saveSession(await signIn(body)).account,
    onSuccess: (account) => {
      queryClient.setQueryData(authKeys.me, account)
    },
  })
}
