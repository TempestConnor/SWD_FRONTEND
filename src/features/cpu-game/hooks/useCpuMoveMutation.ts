import { useMutation, useQueryClient } from '@tanstack/react-query'
import { playCpuMove, type CpuMoveRequest } from '../api'
import { cpuPositionQuery } from './useCpuPositionQuery'

/**
 * Asks the backend for the CPU's reply to the move list, then loads the resulting position into the cache,
 * so committing the moves afterwards shows the new board without another request. Resolves to the full
 * move list; it equals the request when the game ended before the CPU's turn.
 */
export function useCpuMoveMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: CpuMoveRequest) => {
      const state = await playCpuMove(body)
      const moves = state.cpuMove ? [...body.moves, state.cpuMove] : body.moves
      await queryClient.fetchQuery(cpuPositionQuery(moves))
      return moves
    },
  })
}
