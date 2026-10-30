import { useQuery } from '@tanstack/react-query'
import { getHistoryGame } from '../api'
import { matchHistoryKeys } from '../queryKeys'

export function useHistoryGameQuery(gameId: number, enabled: boolean) {
  return useQuery({
    queryKey: matchHistoryKeys.game(gameId),
    queryFn: () => getHistoryGame(gameId),
    enabled,
  })
}
