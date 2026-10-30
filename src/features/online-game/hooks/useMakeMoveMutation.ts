import { makeMove, type MoveSubmission } from '../api'
import { useGameActionMutation } from './useGameActionMutation'

export function useMakeMoveMutation(gameId: number) {
  return useGameActionMutation(gameId, (submission: MoveSubmission) => makeMove(gameId, submission))
}
