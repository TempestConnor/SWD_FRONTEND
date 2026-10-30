import { describe, expect, it } from 'vitest'
import { legalMoves, sideToMove } from './chess'

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
