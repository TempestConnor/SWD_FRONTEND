import { Chess } from 'chess.js'
import { ApiError } from '../api/errors'
import type { components } from '../api/schema'

type Position = components['schemas']['LocalPositionDTO']
type CpuState = components['schemas']['CpuGameStateDTO']
type CpuMoveRequest = components['schemas']['CpuMoveRequestDTO']

/** Picks the CPU's reply from the sorted legal moves; the first one by default. */
export type CpuPick = (legalMoves: string[]) => string

const firstLegalMove: CpuPick = (legalMoves) => legalMoves[0]

/**
 * Answers POST /api/cpu-games/cpu-move the way the backend does: replays the list, plays no move once the
 * game is over, throws NOT_CPU_TURN on the player's turn, and otherwise appends the CPU's reply.
 */
export function fakeCpuMove(request: CpuMoveRequest, pick: CpuPick = firstLegalMove): CpuState {
  const before = replayPosition(request.moves)
  const base = { difficulty: request.difficulty, playerColor: request.playerColor }
  if (before.status !== 'ACTIVE') {
    return { ...base, ...stateOf(before) }
  }
  if (before.sideToMove === request.playerColor) {
    throw new ApiError(409, 'NOT_CPU_TURN', "It is not the CPU's turn to move.")
  }
  const cpuMove = pick(before.legalMoves ?? [])
  const after = replayPosition([...request.moves, cpuMove])
  return { ...base, cpuMove, cpuMoveSan: after.lastMoveSan, ...stateOf(after) }
}

/** Answers POST /api/cpu-games for an already resolved color: the CPU opens when the player is Black. */
export function fakeCpuStart(difficulty: string, playerColor: 'WHITE' | 'BLACK', pick?: CpuPick): CpuState {
  if (playerColor === 'BLACK') {
    return fakeCpuMove({ difficulty, playerColor, moves: [] }, pick)
  }
  return { difficulty, playerColor, ...stateOf(replayPosition([])) }
}

function stateOf(position: Position) {
  const { fen, sideToMove, ply, status, result } = position
  return { fen, sideToMove, ply, status, result }
}

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
