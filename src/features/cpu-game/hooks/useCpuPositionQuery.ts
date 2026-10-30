import { queryOptions, useQuery } from '@tanstack/react-query'
import { ApiError } from '../../../api/errors'
import { getCpuPosition } from '../api'

export const cpuGameKeys = {
  position: (moves: string[]) => ['cpu-game', 'position', moves] as const,
}

/** A move list always replays to the same position, so the answer never goes stale. */
export function cpuPositionQuery(moves: string[]) {
  return queryOptions({
    queryKey: cpuGameKeys.position(moves),
    queryFn: () => getCpuPosition(moves),
    staleTime: Infinity,
    // An illegal move list stays illegal; only transient failures are worth retrying.
    retry: (failureCount, error) => !isRejectedMoveList(error) && failureCount < 3,
  })
}

export function useCpuPositionQuery(moves: string[] | null) {
  return useQuery({ ...cpuPositionQuery(moves ?? []), enabled: moves !== null })
}

/** The backend refused the move list itself, as opposed to failing to answer. */
export function isRejectedMoveList(error: unknown): boolean {
  return error instanceof ApiError && error.status === 400
}
