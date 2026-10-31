import { describe, expect, it } from 'vitest'
import { checkedKingSquare, isCapture, legalMoves, sideToMove } from './chess'

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

describe('legal moves for instant board feedback', () => {
  it('lists the twenty opening moves in UCI', () => {
    const moves = legalMoves(startFen)

    expect(moves).toHaveLength(20)
    expect(moves).toContain('e2e4')
    expect(moves).toContain('g1f3')
    expect(moves).not.toContain('e2e5')
  })

  it('lists every promotion piece as its own UCI move', () => {
    const moves = legalMoves('7k/4P3/8/8/8/8/8/K7 w - - 0 1')

    expect(moves).toEqual(expect.arrayContaining(['e7e8q', 'e7e8r', 'e7e8b', 'e7e8n']))
  })

  it('lists no moves in a finished position', () => {
    const foolsMate = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'

    expect(legalMoves(foolsMate)).toEqual([])
  })

  it('lists no moves for a FEN it cannot read', () => {
    expect(legalMoves('not a fen')).toEqual([])
  })
})

describe('side to move', () => {
  it('reads the side to move from the FEN', () => {
    expect(sideToMove(startFen)).toBe('WHITE')
    expect(sideToMove(afterE4)).toBe('BLACK')
  })
})

describe('check highlight', () => {
  it('finds the king of the side to move when it is in check', () => {
    // 1.e4 f5 2.Qh5+
    const check = 'rnbqkbnr/ppppp1pp/8/5p1Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2'

    expect(checkedKingSquare(check)).toBe('e8')
  })

  it('finds the mated king', () => {
    const foolsMate = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'

    expect(checkedKingSquare(foolsMate)).toBe('e1')
  })

  it('finds nothing when the side to move is not in check', () => {
    expect(checkedKingSquare(startFen)).toBeNull()
    expect(checkedKingSquare('not a fen')).toBeNull()
  })
})

describe('capture highlight', () => {
  // 1.e4 d5: exd5 captures, e4e5 does not.
  const scandinavian = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2'

  it('marks a move onto an enemy piece as a capture', () => {
    expect(isCapture(scandinavian, 'e4d5')).toBe(true)
  })

  it('does not mark a quiet move as a capture', () => {
    expect(isCapture(scandinavian, 'e4e5')).toBe(false)
    expect(isCapture(startFen, 'e2e4')).toBe(false)
  })

  it('marks en passant as a capture although the target square is empty', () => {
    const enPassant = 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3'

    expect(isCapture(enPassant, 'e5f6')).toBe(true)
  })

  it('does not mark a move as a capture for a FEN it cannot read', () => {
    expect(isCapture('not a fen', 'e2e4')).toBe(false)
  })
})
