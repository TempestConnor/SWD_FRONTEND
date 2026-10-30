import { queryOptions, useQuery } from '@tanstack/react-query'
import { ApiError } from '../../../api/errors'
import { getLocalPosition } from '../api'

export const localGameKeys = {
  position: (moves: string[]) => ['local-game', 'position', moves] as const,
}

/** A move list always replays to the same position, so the answer never goes stale. */
export function localPositionQuery(moves: string[]) {
  return queryOptions({
    queryKey: localGameKeys.position(moves),
    queryFn: () => getLocalPosition(moves),
    staleTime: Infinity,
    // An illegal move list stays illegal; only transient failures are worth retrying.
    retry: (failureCount, error) => !isRejectedMoveList(error) && failureCount < 3,
  })
}

export function useLocalPositionQuery(moves: string[] | null) {
  return useQuery({ ...localPositionQuery(moves ?? []), enabled: moves !== null })
}

/** The backend refused the move list itself, as opposed to failing to answer. */
export function isRejectedMoveList(error: unknown): boolean {
  return error instanceof ApiError && error.status === 400
}
