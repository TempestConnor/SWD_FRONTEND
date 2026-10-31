import { Chess, type Square } from 'chess.js'

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

/** The square of the side to move's king when it is in check, for the board highlight; otherwise null. */
export function checkedKingSquare(fen: string): string | null {
  try {
    const chess = new Chess(fen)
    return chess.inCheck() ? (chess.findPiece({ type: 'k', color: chess.turn() })[0] ?? null) : null
  } catch {
    return null
  }
}

/** Whether a UCI move takes a piece, en passant included, for the board highlight. False for a FEN chess.js cannot read. */
export function isCapture(fen: string, uci: string): boolean {
  const target = uci.slice(2, 4)
  try {
    const chess = new Chess(fen)
    if (chess.get(target as Square)) {
      return true
    }
    // En passant lands on an empty square: a pawn moving diagonally onto the FEN's en passant square.
    const piece = chess.get(uci.slice(0, 2) as Square)
    return piece?.type === 'p' && uci[0] !== uci[2] && fen.split(' ')[3] === target
  } catch {
    return false
  }
}

export type PieceKind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'

/** One replayed move for the move record: its SAN, who played it, and the piece it took, if any. */
export type PlayedMove = { san: string; side: Side; captured: PieceKind | null }

export function replayMoves(initialFen: string, _uciMoves: string[]): { played: PlayedMove[]; fen: string } {
  throw new Error(`not implemented: ${initialFen}`)
}

export function materialLead(_fen: string): { side: Side; points: number } | null {
  throw new Error('not implemented')
}
