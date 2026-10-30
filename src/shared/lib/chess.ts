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
