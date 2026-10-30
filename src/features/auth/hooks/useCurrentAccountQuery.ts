import { useQuery } from '@tanstack/react-query'
import { authKeys, getCurrentAccount } from '../api'

/** The signed-in account with current ratings. Disabled for guests so they never call /me. */
export function useCurrentAccountQuery(signedIn: boolean) {
  return useQuery({ queryKey: authKeys.me, queryFn: getCurrentAccount, enabled: signedIn })
}
