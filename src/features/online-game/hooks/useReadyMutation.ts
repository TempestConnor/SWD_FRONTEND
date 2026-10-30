import { markReady } from '../api'
import { useGameActionMutation } from './useGameActionMutation'

export function useReadyMutation(gameId: number) {
  return useGameActionMutation(gameId, () => markReady(gameId))
}
