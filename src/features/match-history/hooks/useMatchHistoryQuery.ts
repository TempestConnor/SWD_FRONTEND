import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getMatchHistory } from '../api'
import { matchHistoryKeys } from '../queryKeys'

export function useMatchHistoryQuery(page: number) {
  return useQuery({
    queryKey: matchHistoryKeys.page(page),
    queryFn: () => getMatchHistory(page),
    // Keeps the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
