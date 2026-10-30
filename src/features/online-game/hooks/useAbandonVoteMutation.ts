import { voteToAbandon } from '../api'
import { useGameActionMutation } from './useGameActionMutation'

export function useAbandonVoteMutation(gameId: number) {
  return useGameActionMutation(gameId, () => voteToAbandon(gameId))
}
