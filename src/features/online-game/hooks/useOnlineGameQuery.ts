import { useQuery } from '@tanstack/react-query'
import { getOnlineGame } from '../api'
import { onlineGameKeys } from '../queryKeys'

export function useOnlineGameQuery(gameId: number, enabled: boolean) {
  return useQuery({ queryKey: onlineGameKeys.detail(gameId), queryFn: () => getOnlineGame(gameId), enabled })
}
