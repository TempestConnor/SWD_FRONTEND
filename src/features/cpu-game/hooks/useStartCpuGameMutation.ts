import { useMutation, useQueryClient } from '@tanstack/react-query'
import { startCpuGame, type StartCpuGameRequest } from '../api'
import { cpuPositionQuery } from './useCpuPositionQuery'

/**
 * Starts a game and loads the position with its legal moves before resolving, so the board renders at once.
 * Resolves to the backend's state and the opening move list: the CPU's first move when the player is Black.
 */
export function useStartCpuGameMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: StartCpuGameRequest) => {
      const state = await startCpuGame(body)
      const moves = state.cpuMove ? [state.cpuMove] : []
      await queryClient.fetchQuery(cpuPositionQuery(moves))
      return { state, moves }
    },
  })
}
