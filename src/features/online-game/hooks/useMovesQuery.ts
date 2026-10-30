import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getMoves } from '../api'
import { onlineGameKeys } from '../queryKeys'

/** The accepted moves, re-read whenever the game's last ply changes; the previous list stays shown meanwhile. */
export function useMovesQuery(gameId: number, lastPly: number, enabled: boolean) {
  return useQuery({
    queryKey: onlineGameKeys.moves(gameId, lastPly),
    queryFn: () => getMoves(gameId),
    enabled,
    placeholderData: keepPreviousData,
  })
}
