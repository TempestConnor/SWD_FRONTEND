import { cancelOnlineGame } from '../api'
import { useGameActionMutation } from './useGameActionMutation'

export function useCancelGameMutation(gameId: number) {
  return useGameActionMutation(gameId, () => cancelOnlineGame(gameId))
}
