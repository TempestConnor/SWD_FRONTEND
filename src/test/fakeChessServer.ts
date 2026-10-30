import { Chess } from 'chess.js'
import { ApiError } from '../api/errors'
import type { components } from '../api/schema'

type Position = components['schemas']['LocalPositionDTO']

/**
 * Replays UCI moves the way POST /api/local-games/state does, so tests get realistic positions.
 * Throws the backend's ILLEGAL_MOVE_SEQUENCE error for an illegal list.
 */
export function replayPosition(moves: string[]): Position {
  const chess = new Chess()
  for (const move of moves) {
    try {
      chess.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] })
    } catch {
      throw new ApiError(400, 'ILLEGAL_MOVE_SEQUENCE', 'The move list contains an illegal move.')
    }
  }

  const history = chess.history()
  const status = statusOf(chess)
  const sideToMove = chess.turn() === 'w' ? 'WHITE' : 'BLACK'

  return {
    fen: chess.fen(),
    sideToMove,
    ply: history.length,
    lastMoveSan: history.at(-1),
    status,
    result: resultOf(status, sideToMove),
    legalMoves:
      status === 'ACTIVE'
        ? chess
            .moves({ verbose: true })
            .map((move) => move.lan)
            .sort()
        : [],
  }
}

function statusOf(chess: Chess) {
  if (chess.isCheckmate()) return 'CHECKMATE'
  if (chess.isStalemate()) return 'STALEMATE'
  if (chess.isInsufficientMaterial()) return 'INSUFFICIENT_MATERIAL'
  if (chess.isThreefoldRepetition()) return 'THREEFOLD_REPETITION'
  if (chess.isDrawByFiftyMoves()) return 'FIFTY_MOVE_RULE'
  return 'ACTIVE'
}

function resultOf(status: string, sideToMove: string) {
  if (status === 'ACTIVE') return undefined
  if (status !== 'CHECKMATE') return 'DRAW'
  return sideToMove === 'WHITE' ? 'BLACK_WIN' : 'WHITE_WIN'
}
