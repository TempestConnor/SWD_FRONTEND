import { resignOnlineGame } from '../api'
import { useGameActionMutation } from './useGameActionMutation'

export function useResignMutation(gameId: number) {
  return useGameActionMutation(gameId, () => resignOnlineGame(gameId))
}
