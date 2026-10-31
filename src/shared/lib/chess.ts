import { Chess } from 'chess.js'

export type Side = 'WHITE' | 'BLACK'

export function opponent(side: Side): Side {
  return side === 'WHITE' ? 'BLACK' : 'WHITE'
}

/** The backend sends sides as plain strings; anything but BLACK is read as WHITE. */
export function toSide(value: string | undefined): Side {
  return value === 'BLACK' ? 'BLACK' : 'WHITE'
}

/**
 * The position after one UCI move, for optimistic display only; the backend stays authoritative (BR-MOVE-001).
 * Returns the original FEN when chess.js cannot apply the move.
 */
export function applyUciMove(fen: string, uci: string): string {
  try {
    const chess = new Chess(fen)
    chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    return chess.fen()
  } catch {
    return fen
  }
}

/**
 * The legal moves in UCI, for instant board feedback where the backend sends no list (online games).
 * The backend still decides every move. Empty for a finished position or a FEN chess.js cannot read.
 */
export function legalMoves(fen: string): string[] {
  try {
    return new Chess(fen).moves({ verbose: true }).map((move) => move.lan)
  } catch {
    return []
  }
}

export function sideToMove(fen: string): Side {
  return fen.split(' ')[1] === 'b' ? 'BLACK' : 'WHITE'
}

export function checkedKingSquare(_fen: string): string | null {
  throw new Error('not implemented')
}

export function isCapture(_fen: string, _uci: string): boolean {
  throw new Error('not implemented')
}
